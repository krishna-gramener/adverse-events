let token_url=""
let openai_url=""
let gemini_url=""
let token=""

// api-config.js
let apiFormElement;
let mainContentElement;

function setupAPI(apiForm, mainContent) {
    apiFormElement = apiForm;
    mainContentElement = mainContent;
    
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
    apiForm.classList.remove('hidden');
    mainContent.classList.add('hidden');
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
    apiForm.classList.add('hidden');
    mainContent.classList.remove('hidden');
    
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
        mainContent.classList.remove('hidden');
        apiForm.classList.add('hidden');
    } catch (error) {
        showError("Failed to initialize: " + error.message);
    }
  }
  
  export {openai_url, gemini_url, token, setupAPI};