// region MODULE_CONTRACT [DOMAIN(7): UI, React; CONCEPT(9): EntryPoint, Rendering; TECH(9): React19, ReactDOM, TypeScript]
// ## @modulecontract
// ## @purpose To serve as the React application entry point вЂ” mounts the App component into the DOM and enables StrictMode for development-time checks.
// ## @scope React DOM rendering, StrictMode wrapper.
// ## @input None (reads #root element from index.html).
// ## @output Rendered React tree in the browser.
// ## @links [USES_API(9): react-dom/client; USES_COMPONENT: src/App]
// ## @invariants
// ## - Application is ALWAYS rendered inside StrictMode.
// ## - Target DOM element MUST have id="root".
// ## @changes
// ## LAST_CHANGE: [v1.0.0 вЂ“ Added semantic markup]
// ## @modulemap
// ## FUNC 9[Entry point вЂ” renders React app into DOM] => (module level)
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: React, entry point, main, render, DOM, StrictMode
// STRUCTURE: в–¶ в”ЊcreateRoot(#root)в”ђ в†’ в—‹ render(гЂ€StrictModeгЂ‰ в†’ гЂ€App /гЂ‰ в†’ гЂ€/StrictModeгЂ‰) в†’ вЋ‹ mounted

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
