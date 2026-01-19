# Thinking Mode Implementation Changelog

## Summary
Implemented optional "Extended Thinking" mode for Claude Opus 4.5 with premium UI toggle.

---

## Backend Changes

### `backend/server.js`
- Added `anthropic-beta: output-128k-2025-02-19` header
- Conditionally includes `thinking` block when `thinkingEnabled` is true:
```javascript
...(req.body.thinkingEnabled ? {
  thinking: { type: 'enabled', budget_tokens: 8000 }
} : {})
```
- Added streaming handlers for `thinking_delta` chunks
- Removed `effort` parameter (caused "Extra inputs" error on Azure)

---

## Frontend Changes

### `src/components/chat/ChatInput.tsx`
- Added `History` icon from lucide-react
- Implemented `Shift+Cmd+E` keyboard shortcut
- Added orange glow + "Pro" badge when active
- Props: `isThinkingEnabled`, `onToggleThinking`

### `src/hooks/useChat.ts`
- Added `isThinkingEnabled` state (persisted to localStorage key: `tufti_thinking_mode`)
- Added `toggleThinkingMode()` function
- Passes `thinkingEnabled` to `getAiResponse()`

### `src/lib/chat-service.ts`
- Added `thinkingEnabled` parameter to `getAiResponse()`
- Streams `thinking` chunks via `onThinking` callback

### `src/components/Chat.tsx`
- Passes `isThinkingEnabled` and `toggleThinkingMode` to `ChatInput`
- Passes `isThinking` to `MessageList`

### `src/components/chat/MessageList.tsx`
- Added `isThinking` prop, passes to `Message` components

### `src/components/message/Message.tsx`
- Added `isThinking` to props, passes to `MessageContent`

---

## Issue Resolved
**"effort: Extra inputs are not permitted"** - The Azure Anthropic endpoint does not support the `effort` parameter. Removed it from the API call.
