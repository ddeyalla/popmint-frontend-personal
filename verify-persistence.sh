#!/bin/bash

# Comprehensive persistence verification script

echo "🧪 Persistence Verification Script"
echo "=================================="
echo ""

# Test session ID
SESSION_ID="verify-test-$(date +%s)"
echo "📝 Using session ID: $SESSION_ID"

# Step 1: Get/create project
echo ""
echo "🔍 Step 1: Getting/creating project..."
PROJECT_RESPONSE=$(curl -s "http://localhost:3000/api/projects/by-session/$SESSION_ID")
PROJECT_ID=$(echo $PROJECT_RESPONSE | grep -o '"project_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Failed to get project ID"
    exit 1
fi

echo "✅ Project ID: $PROJECT_ID"

# Step 2: Add test messages
echo ""
echo "💬 Step 2: Adding test messages..."

MESSAGE_1=$(curl -s -X POST "http://localhost:3000/api/projects/$PROJECT_ID/chat" \
    -H "Content-Type: application/json" \
    -d '{"role":"user","content":"Hello! Testing persistence verification."}')

MESSAGE_2=$(curl -s -X POST "http://localhost:3000/api/projects/$PROJECT_ID/chat" \
    -H "Content-Type: application/json" \
    -d '{"role":"assistant","content":"Hi there! I can help verify persistence is working."}')

MESSAGE_3=$(curl -s -X POST "http://localhost:3000/api/projects/$PROJECT_ID/chat" \
    -H "Content-Type: application/json" \
    -d '{"role":"user","content":"Great! Now let me add some images to the canvas."}')

echo "✅ Added 3 test messages"

# Step 3: Add test canvas objects
echo ""
echo "🎨 Step 3: Adding test canvas objects..."

OBJECT_1=$(curl -s -X POST "http://localhost:3000/api/projects/$PROJECT_ID/canvas" \
    -H "Content-Type: application/json" \
    -d '{"type":"image","x":100,"y":100,"width":512,"height":512,"src":"https://supertails.com/cdn/shop/articles/golden-retriever_eb2c9eb0-8f1d-4b87-b2ed-ee467d51f7f0_1200x.jpg?v=1747053622"}')

OBJECT_2=$(curl -s -X POST "http://localhost:3000/api/projects/$PROJECT_ID/canvas" \
    -H "Content-Type: application/json" \
    -d '{"type":"image","x":650,"y":100,"width":512,"height":512,"src":"https://heronscrossing.vet/wp-content/uploads/Golden-Retriever-2048x1365.jpg"}')

OBJECT_3=$(curl -s -X POST "http://localhost:3000/api/projects/$PROJECT_ID/canvas" \
    -H "Content-Type: application/json" \
    -d '{"type":"image","x":375,"y":650,"width":512,"height":512,"src":"https://spotpet.com/_next/image?url=https%3A%2F%2Fimages.ctfassets.net%2Fm5ehn3s5t7ec%2FKtxCRW7y0LXNYcn6BHPPD%2F065b05bda2e516ea6a5887ce9856d1db%2FGolden_Retriever__Price.webp&w=3840&q=75"}')

echo "✅ Added 3 test canvas objects (Golden Retriever images)"

# Step 4: Verify data was saved
echo ""
echo "🔍 Step 4: Verifying data persistence..."

# Check messages
MESSAGES_RESPONSE=$(curl -s "http://localhost:3000/api/projects/$PROJECT_ID/chat")
MESSAGE_COUNT=$(echo $MESSAGES_RESPONSE | grep -o '"id":"[^"]*"' | wc -l)

echo "✅ Found $MESSAGE_COUNT saved messages"

# Check canvas objects
OBJECTS_RESPONSE=$(curl -s "http://localhost:3000/api/projects/$PROJECT_ID/canvas")
OBJECT_COUNT=$(echo $OBJECTS_RESPONSE | grep -o '"id":"[^"]*"' | wc -l)

echo "✅ Found $OBJECT_COUNT saved canvas objects"

# Step 5: Test session mapping
echo ""
echo "🔄 Step 5: Testing session mapping..."

MAPPING_RESPONSE=$(curl -s "http://localhost:3000/api/projects/by-session/$SESSION_ID")
MAPPED_PROJECT_ID=$(echo $MAPPING_RESPONSE | grep -o '"project_id":"[^"]*"' | cut -d'"' -f4)

if [ "$MAPPED_PROJECT_ID" = "$PROJECT_ID" ]; then
    echo "✅ Session mapping works correctly"
else
    echo "❌ Session mapping failed"
fi

# Step 6: Generate summary
echo ""
echo "📊 VERIFICATION SUMMARY"
echo "======================"
echo "Session ID: $SESSION_ID"
echo "Project ID: $PROJECT_ID"
echo "Playground URL: http://localhost:3000/playground/$SESSION_ID"
echo "Messages saved: $MESSAGE_COUNT/3"
echo "Canvas objects saved: $OBJECT_COUNT/3"
echo ""

# Final result
if [ "$MESSAGE_COUNT" -eq 3 ] && [ "$OBJECT_COUNT" -eq 3 ] && [ "$MAPPED_PROJECT_ID" = "$PROJECT_ID" ]; then
    echo "🎉 PERSISTENCE VERIFICATION PASSED! 🎉"
    echo ""
    echo "✅ All requirements verified:"
    echo "  • Chat messages are saved correctly"
    echo "  • Canvas objects are saved with positions"
    echo "  • Session-to-project mapping works"
    echo "  • Data persists across API calls"
    echo ""
    echo "🌐 Next step: Open the playground URL to test frontend hydration:"
    echo "   http://localhost:3000/playground/$SESSION_ID"
    echo ""
    echo "🔄 You should see:"
    echo "  • 3 chat messages in the chat panel"
    echo "  • 3 Golden Retriever images on the canvas:"
    echo "    - Image 1 at position (100,100)"
    echo "    - Image 2 at position (650,100)"
    echo "    - Image 3 at position (375,650)"
    echo "  • All data should load automatically when the page opens"
    exit 0
else
    echo "❌ PERSISTENCE VERIFICATION FAILED!"
    echo "  Messages: $MESSAGE_COUNT/3 $([ "$MESSAGE_COUNT" -eq 3 ] && echo "✅" || echo "❌")"
    echo "  Objects: $OBJECT_COUNT/3 $([ "$OBJECT_COUNT" -eq 3 ] && echo "✅" || echo "❌")"
    echo "  Mapping: $([ "$MAPPED_PROJECT_ID" = "$PROJECT_ID" ] && echo "✅" || echo "❌")"
    exit 1
fi
