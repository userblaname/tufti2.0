# Setup & Refinement Notes

## 1. Message Component Analysis

*   **Examined `src/components/message/MessageActions.tsx`:** Reviewed the component responsible for message action buttons (Copy, Retry, Like, Dislike, Report), noting its use of `useMessage` context and `framer-motion`.
*   **Examined `src/components/message/Message.tsx`:** Reviewed the main message component, observing how it renders the sender, avatar (initially), and content, and conditionally displays `MessageActions`.
*   **Investigated `copyMessage` Functionality:**
    *   Searched for `copyMessage` implementation.
    *   Found the function defined in `src/contexts/MessageContext.tsx` within the `MessageProvider`. Noted it uses `navigator.clipboard.writeText`.
    *   Confirmed its usage within `MessageActions.tsx` via the `useMessage` hook.

## 2. Tailwind Typography Integration & Styling

*   **Installed Plugin:**
    *   The `@tailwindcss/typography` plugin was installed (as stated by the user).
    *   *(Command: `npm install -D @tailwindcss/typography` or `yarn add -D @tailwindcss/typography`)*

*   **Configured `tailwind.config.js`:**
    *   Imported `defaultTheme` from `tailwindcss/defaultTheme`.
    *   Added `require('@tailwindcss/typography')` to the `plugins` array.
    *   Configured custom font families (`baroque`, `modern`) under `theme.extend.fontFamily`.
    *   Extended the theme to include `typography` settings, specifically styling `h1` with `font-baroque`:
        ```javascript
        typography: (theme) => ({
          DEFAULT: {
            css: {
              'h1': {
                fontFamily: theme('fontFamily.baroque').join(', '),
                fontWeight: '700',
              },
              // Add other prose customizations here if needed
            },
          },
        }),
        ```

*   **Applied Prose Styles to AI Messages:**
    *   Modified `src/components/message/MessageContent.tsx`.
    *   Added `prose prose-invert prose-p:font-modern max-w-none` classes to the `div` wrapping the `ReactMarkdown` component for AI messages.
    *   Removed the arbitrary variant class `[&_h1]:font-baroque` as the plugin now handles `h1` styling via the configuration above.

## 3. Avatar Adjustments in `MessageContent.tsx`

*   **Initial Refactor Attempt:** Attempted to fix Avatar usage, but introduced linter errors.
*   **Investigated `Avatar` Component:**
    *   Read `src/components/ui/avatar.tsx`.
    *   Determined it uses Radix UI primitives (`Avatar`, `AvatarImage`, `AvatarFallback`) and the root `Avatar` component doesn't accept a `user` prop directly.
*   **Corrected Avatar Implementation:**
    *   Imported `Avatar` and `AvatarFallback` in `MessageContent.tsx`.
    *   Used `<Avatar><AvatarFallback>U</AvatarFallback></Avatar>` for user messages, applying specific styling to `Avatar` and `AvatarFallback`.
    *   Initially implemented `<Avatar><AvatarFallback>AI</AvatarFallback></Avatar>` for AI messages.
*   **Removed AI Avatar:**
    *   Based on user instruction, completely removed the `<Avatar>` component block from the AI message rendering section in `MessageContent.tsx`. 

## 4. Composing the next scene... indicator

*   **New Position:** The indicator should be placed inside the main container div, right below the Textarea component.
*   **Disappearance Behavior:** The indicator should fade out quickly as soon as the generated message starts appearing, even if the `isGenerating` state hasn't fully updated yet.

*   **Implementation:**
    *   Added an `AnimatePresence` component to conditionally render the indicator.
    *   Used `motion.div` with `initial`, `animate`, and `exit` properties to animate the height and opacity of the indicator.
    *   Added `text-center text-sm text-gray-500 font-baroque italic overflow-hidden` class to the `motion.div` for centered text and overflow handling.

*   **Code Block:**
    ```
    <div className="max-w-3xl mx-auto flex flex-col gap-2.5 bg-white border border-gray-300 rounded-xl p-4 shadow-sm">
      <div className="relative">
        <Textarea /* ...props... */ />
      </div>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-center text-sm text-gray-500 font-baroque italic overflow-hidden"
          >
            Composing the next scene...
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-1 gap-2.5">
         {/* Buttons, Model Text, Send Button */}
      </div>
    </div>
    ``` 

## 5. User Message Bubble Styling

*   **Goal:** Modify the appearance of the user message bubbles for better visual distinction.
*   **File Modified:** `src/components/message/MessageContent.tsx`
*   **Changes Implemented:**
    *   Updated the main `div` container for user messages (`message.sender === "user"`) to use `bg-white` for the background.
    *   Updated the text color within the user message bubble to `text-navy-deep` (color: `#1A2A40`). This includes updating the base text color and specific prose selectors (`prose-p`, `prose-strong`).
    *   Adjusted the user `AvatarFallback` component to use `bg-navy-deep` for its background and `text-white` for the text ("U") to ensure visibility against the new navy background. 