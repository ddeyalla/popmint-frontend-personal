"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { HelpCircle, ImageIcon, Store, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CommandHelpProps {
  className?: string
}

export function CommandHelp({ className }: CommandHelpProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const commands: Array<{
    name: string;
    icon: React.ReactNode;
    description: string;
    example: string;
    bgColor: string;
    borderColor: string;
  }> = []
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("w-8 h-8 rounded-full", className)}
          aria-label="Help with commands"
        >
          <HelpCircle className="w-4 h-4 text-gray-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Available Commands</DialogTitle>
          <DialogDescription>
            Use these commands to interact with the Popmint AI
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {commands.map(cmd => (
            <div 
              key={cmd.name}
              className={cn("p-3 rounded-lg border", cmd.bgColor, cmd.borderColor)}
            >
              <div className="flex items-center gap-2 font-medium text-gray-900 mb-1">
                {cmd.icon}
                <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">{cmd.name}</code>
              </div>
              <p className="text-sm text-gray-600 mb-2">{cmd.description}</p>
              <div className="bg-white bg-opacity-60 rounded border border-gray-200 p-2">
                <p className="text-xs text-gray-500 mb-1">Example:</p>
                <div className="flex items-center gap-1 text-sm">
                  <code className="font-mono text-gray-800">{cmd.example}</code>
                </div>
                {cmd.name === "/ad" && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p className="font-medium text-gray-700">Options:</p>
                    <ul className="list-disc pl-4 space-y-1 mt-1">
                      <li><code className="font-mono">--count=N</code> - Number of ad images to generate (default: 4)</li>
                      <li><code className="font-mono">-n=N</code> - Short form of count option</li>
                    </ul>
                    <p className="mt-2 italic text-gray-600">The AI will analyze the product page, extract key features, and generate creative ad concepts optimized for marketing.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 