"use client";

import { ArrowUp, Globe, ImagePlus} from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";

interface AIInputWithSearchProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  onSubmit?: (value: string, withSearch: boolean) => void;
  onChange?: (value: string) => void;
  onFileSelect?: (file: File) => void;
  className?: string;
  disabled?: boolean;
}

export function AIInputWithSearch({
  id = "ai-input-with-search",
  placeholder = "Search the web...",
  minHeight = 32,
  maxHeight = 164,
  onSubmit,
  onChange,
  onFileSelect,
  className,
  disabled = false
}: AIInputWithSearchProps) {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });
  const [showSearch, setShowSearch] = useState(false);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit?.(value, showSearch);
      setValue("");
      adjustHeight(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect?.(file);
    }
  };

  return (
    <div className={cn("w-full p-1", className)}>
      <div className="relative max-w-xl w-full mx-auto">
        <div className="relative flex flex-col">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <Textarea
              id={id}
              value={value}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full rounded-xl rounded-b-none px-2 py-2 dark:bg-white/5 border-none dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70 resize-none focus-visible:ring-0 leading-[1.2]"
              ref={textareaRef}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !disabled) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
                onChange?.(e.target.value);
              }}
            />
          </div>

          <div className="h-4 dark:bg-white/5 rounded-10px">
            <div className="absolute left-2 bottom-2 flex items-center gap-2">
              <label className={cn(
                "cursor-pointer rounded-lg p-2 bg-black/5 dark:bg-white/5",
                disabled && "opacity-50 cursor-not-allowed"
              )}>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={disabled}
                />
                <ImagePlus className="w-4 h-4 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors" />
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setShowSearch(!showSearch)}
                className={cn(
                  "rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8",
                  showSearch
                    ? "bg-sky-500/15 border-sky-400 text-sky-500"
                    : "bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <motion.div
                    animate={{
                      rotate: showSearch ? 180 : 0,
                      scale: showSearch ? 1.1 : 1,
                    }}
                    whileHover={{
                      rotate: showSearch ? 180 : 15,
                      scale: 1.1,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 10,
                      },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                    }}
                  >
                    <Globe
                      className={cn(
                        "w-4 h-4",
                        showSearch
                          ? "text-blue-500"
                          : "text-inherit"
                      )}
                    />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {showSearch && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{
                        width: "auto",
                        opacity: 1,
                      }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm overflow-hidden whitespace-nowrap text-blue-500 flex-shrink-0"
                    >
                      Search
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <div className="absolute rounded-full right-2 bg-blue-400 bottom-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && handleSubmit()}
                className={cn(
                  "rounded-lg bg-blue-900 p-2 transition-colors",
                  value
                    ? "bg-sky-500/15 text-sky-500"
                    : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <ArrowUp strokeWidth={3} color="white" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 