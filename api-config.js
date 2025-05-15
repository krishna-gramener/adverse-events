let token_url=""
let openai_url=""
let gemini_url=""
let token=""

// api-config.js
let apiFormContainer;
let mainContentElement;
let apiFormElement;

function setupAPI(apiForm, mainContent) {
    // Store references to DOM elements
    apiFormElement = apiForm;
    mainContentElement = mainContent;
    apiFormContainer = document.getElementById('apiForm');
    
    if (!apiFormElement || !mainContentElement || !apiFormContainer) {
        throw new Error('Required DOM elements not found. Make sure all elements exist in the HTML.');
    }
    
    // Set up event listener
    apiFormElement.addEventListener('submit', handleAPISubmit);

    init();
}

function checkStoredAPIs() {
    const stored_token_url = localStorage.getItem('token_url');
    const stored_openai_url = localStorage.getItem('openai_url');
    const stored_gemini_url = localStorage.getItem('gemini_url');
    
    if (stored_token_url && stored_openai_url && stored_gemini_url) {
        token_url = stored_token_url;
        openai_url = stored_openai_url;
        gemini_url = stored_gemini_url;
        return true;
    }
    return false;
  }
  
  // Show API form
  function showAPIForm() {
    apiFormContainer.classList.remove('d-none');
    mainContentElement.classList.add('d-none');
  }
  
  // Handle API form submission
  async function handleAPISubmit(event) {
    event.preventDefault();
    const tokenApiInput = document.getElementById('tokenApi');
    const openaiApiInput = document.getElementById('openaiApi');
    const geminiApiInput = document.getElementById('geminiApi');
    
    token_url = tokenApiInput.value;
    openai_url = openaiApiInput.value;
    gemini_url = geminiApiInput.value;
    
    // Store in localStorage
    localStorage.setItem('token_url', token_url);
    localStorage.setItem('openai_url', openai_url);
    localStorage.setItem('gemini_url', gemini_url);
    
    // Hide form and show main content
    apiFormContainer.classList.add('d-none');
    mainContentElement.classList.remove('d-none');
    
    // Initialize the app
    await init();
  }
  
  async function init() {
    try {
        if (!checkStoredAPIs()) {
            showAPIForm();
            return;
        }
        
        const response = await fetch(token_url, { credentials: "include" });
        const data = await response.json();
        token = data.token;
        
        // Show main content if we have the token
        mainContentElement.classList.remove('d-none');
        apiFormContainer.classList.add('d-none');
    } catch (error) {
        showError("Failed to initialize: " + error.message);
    }
  }
  
  export { gemini_url, token, setupAPI};