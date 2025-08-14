/ Kilo code rules

# Development Guidelines

## Framework & Routing
- **React Router v7**: Use React Router v7, which functions identically to Remix v2
  - Import from `react-router` instead of `remix`
  - Use `data()` function instead of the deprecated `json()` function
- **Routing System**: Uses `remix-flat-routes` library for file-based routing
  - Route files are located in `src/routes/` folder
  - Nested routes: Indicated by folder structure with `+` sign
  - Dynamic routes: Indicated by `$` sign in filename
  - Index routes: `index.tsx` file in folder
  - Catch-all routes: `$.tsx` file in folder
  - Layout routes: `_$layout.tsx` file in folder
  - Root routes: `root.tsx` file in folder

## Development Environment
- **Terminal**: Use Git Bash commands (Windows environment)
  - Do NOT use Windows Command Prompt or PowerShell commands
- **Package Manager**: Use `npm` exclusively

## Code Quality & Standards
- **TypeScript**: Always use type inference or set the proper types
  - NEVER use `any` type
- **Variable Declaration**:
  - Use `const` for variables that won't be reassigned
  - Use `let` for variables that will be reassigned
  - NEVER use `var`
- **Comments**: Add explanatory comments for complex logic to help other developers
- **Coding Paradigm**:
  - Use functional programming principles
  - Prefer pure functions and immutability

## Chat Behavior
- **Code Generation**: Only generate code when explicitly requested
- **File Suggestions**: When suggesting new files, include a comment indicating workspace placement

## UI Components & Styling
- **shadcn/UI**: Prefer shadcn/UI components over custom elements
- **Component Variants**: Use component variants for styling instead of manual `className` styling
- **Motion Library**: Use `motion/react` instead of `framer-motion` (identical API)

## User Experience
- **User-Friendly Messages**: Avoid generic fallback text
  - Use "No results found" instead of "No data found"
  - Use "No data available" instead of "No data"

## Forms & Navigation
- **Form Buttons**: Always specify `type="submit"` or `type="button"`
- **Form Submission**: Use `onSubmit` event, not `onClick` on submit buttons
- **Navigation**: Use `Link` component from `react-router`, not anchor tags


## Command Execution
- **Pre-execution**: Always summarize changes before running terminal commands
Do not ask me to run commands such as npm run dev, as most likely I am already running it.

## Documentations

- **Documentation**: Follow the conventions outlined in `docs/` folder
  - Use Markdown format for documentation files
  - Keep documentation up-to-date with code changes
  - Place the documentation to the appropriate folder in `docs/` if unsure place it under `docs/planning/`
