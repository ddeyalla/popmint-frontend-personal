"use client"

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Copy, Trash } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useSessionStore } from "@/store/sessionStore"

// Simple Modal component that doesn't rely on radix-ui
const SimpleModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  description: string;
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white p-6 rounded-lg">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-gray-500 mt-2">{description}</p>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export function ProjectTitleDropdown() {
  const router = useRouter()
  const { projectName, setProjectName } = useSessionStore()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleDuplicate = () => {
    // Generate a new session ID for the duplicate
    const newSessionId = Math.random().toString(36).substring(2, 9)
    
    // Create a new tab with the duplicated project
    window.open(`/playground/${newSessionId}`, '_blank')
  }

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    // Clear any project data from localStorage if needed
    localStorage.removeItem("popmint-prompt")
    localStorage.removeItem("popmint-images")
    
    // Close the modal
    setIsDeleteDialogOpen(false)
    
    // Navigate back to home page
    router.push("/")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">
            <span className="text-[14px] font-[550] text-[rgba(0,0,0,0.9)]">{projectName}</span>
            <ChevronDown className="w-4 h-4 text-[rgba(0,0,0,0.5)]" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleDuplicate} className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-600">
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Use the SimpleModal instead of Dialog */}
      <SimpleModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete project"
        description="Are you sure you want to delete this project? This action cannot be undone."
      />
    </>
  )
} 