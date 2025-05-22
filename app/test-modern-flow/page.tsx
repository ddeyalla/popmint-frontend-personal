"use client";

import React, { useState } from "react";
import { ModernAdGenerationFlow } from "@/components/playground/chat-panel/agent-states/ModernAdGenerationFlow";
import { Stage } from "@/lib/agent-state-mapper";

export default function TestModernFlowPage() {
  const [currentStage, setCurrentStage] = useState<Stage>('plan');
  
  const stages: Stage[] = [
    'plan', 'page_scrape_started', 'page_scrape_done',
    'research_started', 'research_done', 'concepts_started', 'concepts_done',
    'ideas_started', 'ideas_done', 'images_started', 'image_generation_progress', 'images_done', 'done'
  ];

  const nextStage = () => {
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      setCurrentStage(stages[currentIndex + 1]);
    }
  };

  const prevStage = () => {
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex > 0) {
      setCurrentStage(stages[currentIndex - 1]);
    }
  };

  const mockData = {
    startTime: new Date(Date.now() - 120000), // 2 minutes ago
    scrapedContent: {
      title: "Unflavoured Raw Whey Protein Concentrate 26 g - The Whole Truth Foods",
      description: "Order online from The Whole Truth Foods and get delivery within 2-7 days. This premium whey protein concentrate delivers 26g of high-quality protein per serving, perfect for muscle building and recovery. Made with clean ingredients and no artificial additives.",
      price: "2777",
      features: ["26g protein per serving", "No artificial additives", "Fast absorption", "Unflavored versatility"],
      rating: "4.5",
      review_count: "1,247"
    },
    researchSummary: "After extensive research, we found that customers love products that are easy to use, affordable, and solve real problems. The target audience is primarily millennials and Gen Z who value convenience and sustainability. Competitors include similar products but this one stands out due to its unique features and competitive pricing. Market analysis shows strong demand for this type of product with customers specifically looking for clean label supplements without artificial ingredients. The protein market is highly competitive but there's a clear opportunity for transparent brands. Customer reviews consistently mention the importance of mixability, taste (or lack thereof for unflavored), and visible results. Price sensitivity is moderate with customers willing to pay premium for quality and transparency...",
    adIdeas: [
      {
        title: "Problem-Solution Ad",
        headline: "Tired of [Problem]? We've Got You Covered!",
        body_text: "Our amazing product solves your everyday problems with ease."
      },
      {
        title: "Feature-Focused Ad", 
        headline: "3 Features That Will Change Your Life",
        body_text: "Discover the powerful features that make our product unique."
      },
      {
        title: "Social Proof Ad",
        headline: "Join 10,000+ Happy Customers",
        body_text: "See why thousands of people choose our product every day."
      }
    ],
    generatedImages: [
      "https://picsum.photos/400/300?random=1",
      "https://picsum.photos/400/300?random=2", 
      "https://picsum.photos/400/300?random=3",
      "https://picsum.photos/400/300?random=4"
    ],
    currentImage: 2,
    totalImages: 4,
    stepTimings: [
      {
        stage: 'page_scrape',
        startTime: new Date(Date.now() - 90000),
        endTime: new Date(Date.now() - 80000),
        duration: 10000
      },
      {
        stage: 'research',
        startTime: new Date(Date.now() - 70000),
        endTime: new Date(Date.now() - 50000), 
        duration: 20000
      },
      {
        stage: 'concepts',
        startTime: new Date(Date.now() - 40000),
        endTime: new Date(Date.now() - 30000),
        duration: 10000
      },
      {
        stage: 'ideas',
        startTime: new Date(Date.now() - 25000),
        endTime: new Date(Date.now() - 15000),
        duration: 10000
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Modern Ad Generation Flow Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test the new Perplexity-style agentic flow UI
          </p>
          
          {/* Stage Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={prevStage}
              disabled={stages.indexOf(currentStage) === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous Stage
            </button>
            
            <span className="px-4 py-2 bg-gray-100 rounded-lg font-mono text-sm">
              {currentStage} ({stages.indexOf(currentStage) + 1}/{stages.length})
            </span>
            
            <button
              onClick={nextStage}
              disabled={stages.indexOf(currentStage) === stages.length - 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next Stage
            </button>
          </div>
        </div>

        {/* Modern Flow Component */}
        <div className="flex justify-center">
          <ModernAdGenerationFlow
            currentStage={currentStage}
            startTime={mockData.startTime}
            scrapedContent={mockData.scrapedContent}
            researchSummary={mockData.researchSummary}
            adIdeas={mockData.adIdeas}
            generatedImages={currentStage === 'done' ? mockData.generatedImages : undefined}
            currentImage={currentStage === 'image_generation_progress' ? mockData.currentImage : undefined}
            totalImages={currentStage === 'image_generation_progress' ? mockData.totalImages : undefined}
            stepTimings={mockData.stepTimings}
          />
        </div>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-white rounded-lg border">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify({ currentStage, stageIndex: stages.indexOf(currentStage) }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
} 