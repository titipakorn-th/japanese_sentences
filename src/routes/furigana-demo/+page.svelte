<!--
  Furigana Demo Page - Demonstrates the hybrid furigana generation system
-->
<script lang="ts">
  import { generateFuriganaViaApi } from '$lib/services/api-service';
  import FuriganaEditor from '$lib/components/FuriganaEditor.svelte';
  import type { FuriganaItem } from '$lib/db/types';
  import { browser } from '$app/environment';
  
  // State using Svelte 5 runes
  let inputText = $state('日本語を勉強しています。頑張ります！');
  let furiganaItems = $state<FuriganaItem[]>([]);
  let isLoading = $state(false);
  let useMockLLM = $state(browser); // Always use mock LLM in browser
  let errorMessage = $state('');
  let showEditor = $state(false);
  
  // Generate furigana from the input text
  async function generateFurigana() {
    errorMessage = '';
    
    if (!inputText.trim()) {
      errorMessage = 'Please enter some Japanese text';
      return;
    }
    
    try {
      isLoading = true;
      console.log(`Generating furigana with mock mode: ${useMockLLM}`);
      furiganaItems = await generateFuriganaViaApi(inputText, useMockLLM);
      
      if (furiganaItems.length > 0) {
        showEditor = true;
      } else {
        errorMessage = 'No furigana could be generated. Try a different text or provider.';
      }
    } catch (error) {
      console.error('Error generating furigana:', error);
      errorMessage = 'Failed to generate furigana. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  // Handle furigana updates from the editor
  function handleFuriganaUpdate(updatedFurigana: FuriganaItem[]) {
    furiganaItems = updatedFurigana;
  }
  
  // Reset the demo
  function resetDemo() {
    inputText = '';
    furiganaItems = [];
    showEditor = false;
    errorMessage = '';
  }
</script>

<svelte:head>
  <title>Japanese Learning Toolkit - Furigana Generation Demo</title>
</svelte:head>

<div class="furigana-demo">
  <header>
    <h1>Hybrid Furigana Generation System</h1>
    <p class="subtitle">A multi-layered approach to generating and correcting furigana readings</p>
  </header>
  
  <div class="environment-indicator">
    {browser ? 'Running in browser (mock morphological analyzer)' : 'Running on server (full morphological analysis)'}
  </div>
  
  <div class="demo-container">
    <div class="input-section">
      <h2>Input Japanese Text</h2>
      <div class="input-area">
        <textarea 
          bind:value={inputText} 
          placeholder="Enter Japanese text here..."
          rows="4"
        ></textarea>
      </div>
      
      <div class="options">
        <div class="mock-mode-option">
          <label>
            <input 
              type="checkbox" 
              bind:checked={useMockLLM}
              disabled={browser} 
            />
            Use Mock Mode {browser ? '(Always enabled in browser)' : '(No API calls)'}
          </label>
          <p class="option-description">
            When checked, predefined responses will be used instead of calling the OpenAI API.
            {browser ? 'This is forced on when running in the browser.' : ''}
          </p>
        </div>
      </div>
      
      <div class="actions">
        <button 
          class="generate-button" 
          onclick={generateFurigana} 
          disabled={isLoading || !inputText.trim()}
        >
          {isLoading ? 'Generating...' : 'Generate Furigana'}
        </button>
        <button class="reset-button" onclick={resetDemo}>Reset</button>
      </div>
      
      {#if errorMessage}
        <div class="error-message">
          {errorMessage}
        </div>
      {/if}
    </div>
    
    {#if showEditor}
      <div class="result-section">
        <h2>Generated Furigana</h2>
        <p class="help-text">Click on any kanji to edit its reading</p>
        
        <div class="furigana-display">
          <FuriganaEditor 
            sentenceText={inputText} 
            furiganaData={furiganaItems} 
            onUpdate={handleFuriganaUpdate} 
          />
        </div>
        
        <div class="technical-details">
          <h3>Technical Details</h3>
          <p>The system uses a multi-layered approach:</p>
          <ol>
            <li><strong>Dictionary Layer:</strong> Looks up words in the vocabulary database</li>
            <li><strong>Morphological Layer:</strong> {browser ? 'Uses simplified mocks for browser' : 'Uses kuromoji for morphological analysis'}</li>
            <li><strong>LLM Layer:</strong> {useMockLLM ? 'Uses predefined mock responses (no API calls)' : 'Uses AI models for complex or unknown words'}</li>
            <li><strong>Learning Layer:</strong> Incorporates your corrections for future use</li>
          </ol>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .furigana-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  
  header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  .subtitle {
    font-size: 1.2rem;
    color: #666;
    margin-top: 0;
  }
  
  .environment-indicator {
    background-color: #f8f4e3;
    border-left: 3px solid #e67e22;
    padding: 0.75rem 1rem;
    margin: 0 auto 2rem;
    max-width: 800px;
    font-size: 0.95rem;
    color: #7f4f24;
    border-radius: 0 4px 4px 0;
    text-align: center;
  }
  
  .demo-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  @media (min-width: 992px) {
    .demo-container {
      grid-template-columns: 1fr 1fr;
    }
  }
  
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #333;
  }
  
  h3 {
    font-size: 1.2rem;
    margin-bottom: 0.75rem;
    color: #444;
  }
  
  .input-area {
    margin-bottom: 1.5rem;
  }
  
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    font-size: 1.1rem;
    font-family: inherit;
    line-height: 1.5;
    resize: vertical;
  }
  
  .options {
    margin-bottom: 1.5rem;
  }
  
  .mock-mode-option {
    margin-bottom: 1rem;
  }
  
  .option-description {
    margin-top: 0.25rem;
    font-size: 0.85rem;
    color: #777;
  }
  
  .actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  button {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.25rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
  }
  
  .generate-button {
    background-color: #0d6efd;
    color: white;
  }
  
  .generate-button:hover:not(:disabled) {
    background-color: #0b5ed7;
  }
  
  .generate-button:disabled {
    background-color: #8cb3f1;
    cursor: not-allowed;
  }
  
  .reset-button {
    background-color: #6c757d;
    color: white;
  }
  
  .reset-button:hover {
    background-color: #5c636a;
  }
  
  .error-message {
    color: #dc3545;
    padding: 0.5rem;
    margin-top: 1rem;
    background-color: #f8d7da;
    border-radius: 0.25rem;
  }
  
  .furigana-display {
    margin-bottom: 2rem;
    background-color: #f8f9fa;
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid #dee2e6;
  }
  
  .help-text {
    font-size: 0.9rem;
    color: #6c757d;
    margin-bottom: 1rem;
  }
  
  .technical-details {
    background-color: #e9ecef;
    padding: 1.5rem;
    border-radius: 0.5rem;
  }
  
  .technical-details ol {
    padding-left: 1.5rem;
  }
  
  .technical-details li {
    margin-bottom: 0.5rem;
  }
</style> 