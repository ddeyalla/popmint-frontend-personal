"use client"

import type React from "react"
import { Heart, ImageIcon, X, ArrowUp } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { generateImageFromPrompt } from '@/lib/generate-image'
import { Textarea } from "@/components/ui/textarea"
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea"
import { ProjectSection } from "@/components/home/project-section"
import { useProjectStore } from "@/store/projectStore"

// RegEx for detecting URLs in text
const URL_REGEX = /(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi;

// Image types
type ImageData = {
  id: string;
  file: File | null;
  previewUrl: string;
  type?: 'uploaded' | 'generated';
};

const highlightUrls = (text: string): string => {
  if (!text) return "";

  // First, escape all HTML special characters
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Split the text into parts, some of which are URLs and some aren't
  const parts: { text: string; isUrl: boolean }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({
        text: escapeHtml(text.substring(lastIndex, match.index)),
        isUrl: false
      });
    }

    // Process the URL
    let url = match[0];
    let cleanUrl = url;

    // Remove common trailing punctuation that might not be part of the URL
    const trailingPunctuation = ['.', ',', '!', '?', ';', ':', ')', ']', '}'];
    while (cleanUrl.length > 0 && trailingPunctuation.includes(cleanUrl[cleanUrl.length - 1])) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    // Ensure the URL has a protocol
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    // Add the URL part
    parts.push({
      text: `<span style="color: #0281F2;">${escapeHtml(url)}</span>`,
      isUrl: true
    });

    lastIndex = match.index + url.length;
  }

  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push({
      text: escapeHtml(text.substring(lastIndex)),
      isUrl: false
    });
  }

  // Combine all parts
  return parts.map(part => part.text).join('');
};

export default function Home() {
  const router = useRouter()
  const { createProjectFromPrompt, linkJobToProject } = useProjectStore()
  const [inputValue, setInputValue] = useState("")
  const [hasValidUrl, setHasValidUrl] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<ImageData[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [currentSelection, setCurrentSelection] = useState<{start: number, end: number} | null>(null);

  // Auto-resize contentEditable div and its container as content grows
  useEffect(() => {
    const editableDiv = contentEditableRef.current;
    const container = scrollableContainerRef.current;
    if (!editableDiv || !container) return;

    const MIN_HEIGHT_PX = 60;
    const MAX_HEIGHT_PX = 312;

    if (inputValue === "") {
      container.style.height = `${MIN_HEIGHT_PX}px`;
      editableDiv.style.height = `${MIN_HEIGHT_PX}px`; // Ensure div also respects min height
    } else {
      editableDiv.style.height = 'auto'; // Reset div height to measure its scrollHeight for content
      const contentScrollHeight = editableDiv.scrollHeight;

      const newContainerHeight = Math.max(MIN_HEIGHT_PX, Math.min(contentScrollHeight, MAX_HEIGHT_PX));
      container.style.height = `${newContainerHeight}px`;
      editableDiv.style.height = `${contentScrollHeight}px`;
    }
  }, [inputValue]);

  // Effect to update contentEditable's innerHTML when inputValue changes & restore selection
  useEffect(() => {
    if (contentEditableRef.current) {
      const selection = window.getSelection();
      const currentTextInDiv = contentEditableRef.current.textContent || "";
      const expectedHTML = highlightUrls(inputValue);

      // Only update innerHTML if it's actually different or if plain text differs
      // This helps prevent unnecessary updates if formatting is already correct.
      if (currentTextInDiv !== inputValue || contentEditableRef.current.innerHTML !== expectedHTML) {
        contentEditableRef.current.innerHTML = expectedHTML;

        // Restore selection if the div is focused and a selection was previously saved
        if (currentSelection && selection && document.activeElement === contentEditableRef.current) {
          try {
            const newRange = document.createRange();
            let charCount = 0;
            let startNode: Node | null = null;
            let startIdxInNode = 0;
            let endNode: Node | null = null;
            let endIdxInNode = 0;

            const treeWalker = document.createTreeWalker(contentEditableRef.current, NodeFilter.SHOW_TEXT, null);
            let node;
            while ((node = treeWalker.nextNode())) {
              const nodeText = node.textContent || "";
              const nodeTextLength = nodeText.length;

              if (startNode === null && charCount + nodeTextLength >= currentSelection.start) {
                startNode = node;
                startIdxInNode = currentSelection.start - charCount;
              }
              if (endNode === null && charCount + nodeTextLength >= currentSelection.end) {
                endNode = node;
                endIdxInNode = currentSelection.end - charCount;
                break;
              }
              charCount += nodeTextLength;
            }

            if (startNode && endNode) {
              startIdxInNode = Math.min(startIdxInNode, startNode.textContent?.length || 0);
              endIdxInNode = Math.min(endIdxInNode, endNode.textContent?.length || 0);
              if (startIdxInNode < 0) startIdxInNode = 0;
              if (endIdxInNode < 0) endIdxInNode = 0;

              newRange.setStart(startNode, startIdxInNode);
              newRange.setEnd(endNode, endIdxInNode);

              selection.removeAllRanges();
              selection.addRange(newRange);
            } else if (contentEditableRef.current.childNodes.length > 0) {
              newRange.selectNodeContents(contentEditableRef.current);
              newRange.collapse(false); // To the end
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } catch (error) {
            console.error("Failed to restore selection:", error);
            if (selection && contentEditableRef.current.childNodes.length > 0) {
              const range = document.createRange();
              range.selectNodeContents(contentEditableRef.current);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    }
  }, [inputValue, currentSelection]);

  const handleImageUpload = () => {
    fileInputRef.current?.click()
  }

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newImages: ImageData[] = []

    Array.from(files).forEach((file) => {
      // Only process image files
      if (!file.type.startsWith("image/")) return

      const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const previewUrl = URL.createObjectURL(file)

      newImages.push({
        id,
        file,
        previewUrl,
        type: 'uploaded'
      })
    })

    setUploadedImages((prev) => [...prev, ...newImages])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    processFiles(e.dataTransfer.files)
  }

  const removeImage = (id: string) => {
    setUploadedImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id)

      // Revoke the object URL to avoid memory leaks
      const imageToRemove = prev.find((img) => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
      }

      return filtered
    })
  }

  // Function to proxy an image URL through our proxy API
  const getProxiedImageUrl = (url: string) => {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const handleSubmit = async () => {
    if (isSubmitting || (!inputValue.trim() && uploadedImages.length === 0)) return;

    // Show toast if no URL is present but user wants to submit
    if (inputValue.trim() && !hasValidUrl) {
      // Dynamically import toast to avoid SSR issues
      const { toast } = await import('sonner');
      toast.error('Add product link to generate ad', {
        position: 'bottom-right'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("[HomePage] Starting project creation with persistence...");

      // Create the full prompt for the project
      const fullPrompt = inputValue.trim();

      // Create project using the new persistence system
      const projectId = await createProjectFromPrompt(fullPrompt);

      if (!projectId) {
        throw new Error('Failed to create project');
      }

      console.log("[HomePage] Project created successfully:", projectId);

      // Get image URLs from uploaded images
      const userUploadedImageUrls = uploadedImages.map(img => img.previewUrl);

      // Create initial message object for the chat panel
      const initialMessagePayload = {
        type: "userInput",
        content: inputValue.trim(),
        imageUrls: userUploadedImageUrls
      };

      // Check if input contains a product URL - if it does, mark it for ad generation
      const urlMatch = inputValue.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
      const containsUrl = Boolean(urlMatch && urlMatch.length > 0);
      console.log("[HomePage] URL detected:", containsUrl, urlMatch);

      // Store data in localStorage for the playground to pick up
      // This maintains compatibility with existing playground logic
      localStorage.setItem("popmint-initial-message", JSON.stringify(initialMessagePayload));
      console.log("[HomePage] Set initial message in localStorage");

      if (containsUrl) {
        // We already have the URL match from above, use it directly
        if (urlMatch && urlMatch.length > 0) {
          let productUrl = urlMatch[0];
          if (!productUrl.startsWith('http')) {
            productUrl = 'https://' + productUrl;
          }

          // Set special flag for ad generation - use string literals to ensure proper values
          console.log("[HomePage] Detected ad generation request for URL:", productUrl);

          // IMPORTANT: Set these values directly without any conditional logic
          localStorage.setItem("popmint-generate-ad", "true");
          localStorage.setItem("popmint-product-url", productUrl);

          // Add the process-image flag to match the debug route implementation
          localStorage.setItem("popmint-process-image", "true");
          localStorage.setItem("popmint-prompt-to-process", inputValue.trim());

          console.log("[HomePage] Set ad generation flags in localStorage");
        }
      } else if (inputValue.trim()) {
        // For any other input, don't do special processing
        console.log("[HomePage] Regular chat input detected");
      }

      // Navigate to the playground using the project ID
      console.log("[HomePage] Navigating to playground with project:", projectId);
      router.push(`/playground/${projectId}`);

    } catch (error) {
      console.error("[HomePage] Error in handleSubmit:", error);
      setIsSubmitting(false);
      alert("An error occurred. Please try again.");
    }
  };

  // Check for valid URL in input and update state
  useEffect(() => {
    const containsUrl = URL_REGEX.test(inputValue);
    setHasValidUrl(containsUrl);
  }, [inputValue]);



  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault(); // Prevent newline in contentEditable
      handleSubmit()
    }
  }

  const handleContentEditableInput = (e: React.FormEvent<HTMLDivElement>) => {
    const currentElement = e.currentTarget;
    const newText = currentElement.textContent || "";

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && currentElement.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);

      let selectionStart = 0;
      let selectionEnd = 0;

      // Calculate selectionStart
      const preSelectionRangeStart = document.createRange();
      preSelectionRangeStart.selectNodeContents(currentElement);
      if(currentElement.contains(range.startContainer)){
          preSelectionRangeStart.setEnd(range.startContainer, range.startOffset);
          selectionStart = preSelectionRangeStart.toString().length;
      } else { // Fallback if range.startContainer is not a child of currentElement
          selectionStart = newText.length;
      }

      // Calculate selectionEnd
      const preSelectionRangeEnd = document.createRange();
      preSelectionRangeEnd.selectNodeContents(currentElement);
      if(currentElement.contains(range.endContainer)){
          preSelectionRangeEnd.setEnd(range.endContainer, range.endOffset);
          selectionEnd = preSelectionRangeEnd.toString().length;
      } else { // Fallback if range.endContainer is not a child of currentElement
          selectionEnd = newText.length;
      }

      setCurrentSelection({ start: selectionStart, end: selectionEnd });
    } else {
      const len = newText.length;
      setCurrentSelection({ start: len, end: len });
    }
    setInputValue(newText);
  };

  const handleContentEditablePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    if (!pastedText) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(pastedText);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    const currentElement = e.currentTarget;
    const newFullText = currentElement.textContent || "";

    // Calculate new selection based on pasted text length
    let newCursorPos = 0;
    const tempRangeForCursor = document.createRange();
    tempRangeForCursor.selectNodeContents(currentElement);
    if (currentElement.contains(range.endContainer)) {
        tempRangeForCursor.setEnd(range.endContainer, range.endOffset);
        newCursorPos = tempRangeForCursor.toString().length;
    } else {
        newCursorPos = newFullText.length;
    }

    setCurrentSelection({ start: newCursorPos, end: newCursorPos });
    setInputValue(newFullText);
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-pastel-swirl bg-cover bg-center">
      {/* Fixed gradient background */}
      <div className="container mx-auto px-4 pt-4 pb-2 flex-1 flex flex-col z-100 min-h-[calc(80vh-80px)]">
        {/* Header - Sticky */}
        <header className="flex justify-between items-center sticky z-10">
          <div className="flex items-center gap-1">
            <img src="/popmint_logo.svg" alt="Popmint Logo" className="w-5 h-5" />
            <span className="text-xl font-medium">Popmint</span>
          </div>
          <Button variant="outline" className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-black/90">
            Log in
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex flex-col mt-40 items-center flex-1 w-full max-w-3xl mx-auto">
          <h1
            className="text-4xl md:text-5xl font-bold text-center font-advercase-bold"
            style={{ fontFamily: 'AdvercaseBold, sans-serif' }}
          >
            What are we designing today?
          </h1>
          <p className="mt-4 text-center text-base">Concept to ads, with your personal marketing team</p>

          {/* Input Box - Interactive version with image preview and drag-drop */}
          <div
            className="mt-10 w-full flex justify-center"
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={` w-full max-w-xl px-3 py-2 bg-white rounded-[15px] outline-offset-[-1px]
              ${isDragging ? "outline-blue-400 bg-blue-50" : "outline-gray-200"}
              inline-flex flex-col justify-end items-end gap-2 overflow-hidden transition-colors`}
            >
              {/* Image Previews - Above text input */}
              {uploadedImages.length > 0 && (
                <div className="self-stretch flex flex-wrap gap-2">
                  {uploadedImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <div className="w-20 h-20 rounded-[10px] overflow-hidden border border-gray-200 transition delay-150 duration-240 ease-in-out hover:rotate-5">
                        <img
                          src={img.previewUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute -top-1 -right-1 bg-slate-700 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Text input area */}
              <div className="relative w-full">
                {/* Main content display layer */}
                <div
                  ref={scrollableContainerRef}
                  className="relative"
                  style={{ minHeight: '60px', overflowY: 'auto' }}
                >
                  {/* Actual contentEditable div for user input */}
                  <div
                    ref={contentEditableRef}
                    onInput={handleContentEditableInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handleContentEditablePaste}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    className={`w-full resize-none text-base font-normal leading-normal bg-transparent outline-none p-3 absolute inset-0 text-gray-900`}
                    style={{
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                      lineHeight: '1.5',
                      overflowY: 'hidden', // Important for scrollHeight calculation of parent
                      font: 'inherit',
                      caretColor: 'black',
                      minHeight: '24px', // Ensures div has some height even if empty for placeholder
                    }}
                    data-placeholder="Ask Popmint..."
                    aria-label="Message input"
                    role="textbox"
                    aria-multiline="true"
                    spellCheck={true}
                    autoCorrect="on"
                    autoCapitalize="sentences"
                  />
                  {inputValue === "" && (
                    <div
                      className="absolute inset-0 p-3 text-gray-500 pointer-events-none select-none"
                      style={{ lineHeight: '1.5' }} // Match div's line height
                      aria-hidden="true"
                    >
                      Drop your ideas and the product link you want to create ads for
                    </div>
                  )}
                </div>
              </div>

              {/* Drag overlay message */}
              {isDragging && (
                <div className="absolute inset-0 bg-blue-50 bg-opacity-70 flex items-center justify-center rounded-2xl z-10">
                  <div className="text-blue-500 font-medium flex flex-col items-center">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span>Drop images here</span>
                  </div>
                </div>
              )}

              {/* Buttons row */}
              <div className="self-stretch inline-flex justify-between items-center">
                <div className="flex justify-start items-center gap-2">
                  {/* Image upload button with proper icon */}
                  <button
                    onClick={handleImageUpload}
                    className="p-3 bg-white rounded-[100px] outline outline-offset-[-1px] outline-gray-200 flex justify-center items-center hover:bg-gray-50"
                    aria-label="Upload image"
                  >
                    <ImageIcon className="w-4 h-4 text-gray-700" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={handleSubmit}
                  className={`self-stretch min-w-10 p-2 rounded-[100px] flex justify-center items-center gap-1 overflow-hidden transition-colors ${
                    inputValue.trim() || uploadedImages.length > 0
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!inputValue.trim() && uploadedImages.length === 0 || isSubmitting}
                  aria-label="Send message"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Project Section - Outside container to stretch full width */}
      <ProjectSection />
      <div className="mb-20 px-4">

      </div>
    </div>
  )
}
