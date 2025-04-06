<script lang="ts">
  import { parseFuriganaData } from '$lib/db/queries/sentences';
  import Furigana from '$lib/components/Furigana.svelte';
  import FuriganaEditor from '$lib/components/FuriganaEditor.svelte';
  import type { Sentence, SentenceWithWords, FuriganaItem } from '$lib/db/types';
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  
  const { data, form } = $props<{ data: any; form: any }>();
  
  let isGeneratingFurigana = $state(false);
  let generationError = $state('');
  let showDeleteConfirmation = $state(false);
  let deletionInProgress = $state(false);
  let clientApiKey = $state('');
  let showFuriganaEditor = $state(false);
  
  // Set up local storage key
  const OPENAI_KEY_STORAGE = 'japanese_app_openai_api_key';
  
  // Load API key from localStorage on mount
  onMount(() => {
    if (browser) {
      clientApiKey = localStorage.getItem(OPENAI_KEY_STORAGE) || '';
    }
  });
  
  const sentenceData = $derived(data.sentenceWithWords as SentenceWithWords);
  let sentence = $state(sentenceData.sentence);
  const words = $derived(sentenceData.words);
  let furiganaItems = $state(parseFuriganaData(sentence.furiganaData));
  
  // Update sentence when sentenceData changes
  $effect(() => {
    sentence = sentenceData.sentence;
  });
  
  // Update furiganaItems when sentence changes
  $effect(() => {
    furiganaItems = parseFuriganaData(sentence.furiganaData);
  });
  
  // Function to display a formatted date
  function formatDate(dateStr: Date | string | number) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Function to toggle delete confirmation
  function toggleDeleteConfirmation() {
    showDeleteConfirmation = !showDeleteConfirmation;
  }
  
  // Function to toggle furigana editor
  function toggleFuriganaEditor() {
    showFuriganaEditor = !showFuriganaEditor;
  }
  
  // Function to handle furigana updates
  function handleFuriganaUpdate(event: CustomEvent<{ updatedFurigana: FuriganaItem[] }>) {
    furiganaItems = event.detail.updatedFurigana;
    
    // Update the sentence object as well to reflect the changes
    sentence = {
      ...sentence,
      furiganaData: JSON.stringify(furiganaItems)
    };
  }
  
  // Function to handle deletion
  async function handleDelete(sentenceId: number) {
    if (deletionInProgress) return;
    
    deletionInProgress = true;
    console.log('Starting sentence deletion process for ID:', sentenceId);
    
    try {
      // Send DELETE request to the API
      const response = await fetch(`/sentences/${sentenceId}?/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const result = await response.json().catch(() => null);
      console.log('Delete response:', response.status, result);
      
      if (response.redirected) {
        // Follow the redirect
        console.log('Server redirected to:', response.url);
        window.location.href = response.url;
        return;
      }
      
      if (response.ok || response.status === 404) {
        // Deletion was successful or sentence doesn't exist anymore
        console.log('Deletion successful, redirecting to sentences list');
        window.location.href = '/sentences';
        return;
      }
      
      // If we get here, there was an issue but let's check if the sentence still exists
      const checkResponse = await fetch(`/sentences/${sentenceId}`, { method: 'HEAD' });
      if (checkResponse.status === 404) {
        // Sentence doesn't exist, consider it a success
        console.log('Sentence appears to be deleted despite error, redirecting to list');
        window.location.href = '/sentences';
      } else {
        // Sentence still exists, show error
        console.error('Deletion failed:', result?.error || 'Unknown error');
        deletionInProgress = false;
      }
    } catch (error) {
      console.error('Error during deletion process:', error);
      // On error, we'll assume the deletion might have succeeded
      // and redirect to the list page
      window.location.href = '/sentences';
    }
  }
  
  // Function to generate furigana
  async function generateFurigana() {
    if (isGeneratingFurigana) return;
    
    isGeneratingFurigana = true;
    generationError = '';
    
    try {
      console.log('Starting LLM-based furigana generation for sentence ID:', sentence.sentenceId);
      
      // Include client API key if available
      const requestBody: any = {};
      
      if (clientApiKey) {
        console.log('Using client-side API key for furigana generation');
        requestBody.apiKey = clientApiKey;
      } else {
        console.log('No client-side API key available, using server-side key if configured');
      }
      
      const response = await fetch(`/sentences/${sentence.sentenceId}/generate-furigana`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error ${response.status}: ${errorText}`);
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Furigana generation result:', result);
      
      if (result.success) {
        // Update the sentence with the new furigana data
        console.log('Updating sentence with new furigana data');
        sentence = result.sentence;
        
        // Ensure furiganaItems is parsed properly
        if (Array.isArray(result.furiganaItems)) {
          console.log('Received furigana items array:', result.furiganaItems);
          furiganaItems = result.furiganaItems;
        } else if (typeof result.furiganaItems === 'string') {
          console.log('Received furigana items as string, parsing JSON');
          try {
            furiganaItems = JSON.parse(result.furiganaItems);
          } catch (e) {
            console.error('Error parsing furigana JSON:', e);
            furiganaItems = [];
          }
        } else {
          console.warn('Received unexpected furigana items format:', result.furiganaItems);
          furiganaItems = [];
        }
        
        if (furiganaItems.length === 0) {
          generationError = 'No furigana annotations were generated. The text may not contain any kanji.';
        }
      } else {
        const errorMessage = result.error || 'Failed to generate furigana';
        console.error('Furigana generation failed:', errorMessage);
        generationError = errorMessage;
      }
    } catch (error) {
      console.error('Error generating furigana:', error);
      generationError = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while generating furigana';
    } finally {
      isGeneratingFurigana = false;
    }
  }
</script>

<div class="sentence-detail">
  <header class="page-header">
    <div class="header-content">
      <h1>Sentence Details</h1>
      <div class="header-meta">
        {#if sentence.difficultyLevel}
          <span class="difficulty level-{sentence.difficultyLevel}">
            Level {sentence.difficultyLevel}
          </span>
        {/if}
        <span class="date">Added: {formatDate(sentence.createdAt)}</span>
      </div>
    </div>
    
    <div class="header-actions">
      <a href="/sentences" class="btn-link">Back to Sentences</a>
      <a href="/sentences/{sentence.sentenceId}/edit" class="btn-secondary">Edit</a>
      <button onclick={toggleDeleteConfirmation} class="btn-danger">Delete</button>
    </div>
  </header>
  
  {#if showDeleteConfirmation}
    <div class="delete-confirmation">
      <div class="confirmation-dialog">
        <h2>Confirm Deletion</h2>
        <p>Are you sure you want to delete this sentence? This action cannot be undone.</p>
        <div class="confirmation-actions">
          <button onclick={toggleDeleteConfirmation} class="btn-secondary" disabled={deletionInProgress}>Cancel</button>
          <button 
            onclick={() => handleDelete(sentence.sentenceId)} 
            class="btn-danger" 
            disabled={deletionInProgress}
          >
            {#if deletionInProgress}
              <span class="loading-spinner"></span> Deleting...
            {:else}
              Delete Sentence
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  {#if form?.error}
    <div class="error-message">
      <p>{form.error}</p>
      {#if 'details' in form}
        <p class="error-details">{form.details}</p>
      {/if}
    </div>
  {/if}
  
  <div class="sentence-content">
    <div class="japanese-text">
      <Furigana text={sentence.sentence} furiganaData={furiganaItems} />
    </div>
    
    {#if sentence.translation}
      <div class="translation">
        <h2>Translation</h2>
        <p>{sentence.translation}</p>
      </div>
    {/if}
    
    {#if sentence.tags}
      <div class="tags-section">
        <h2>Tags</h2>
        <div class="tags">
          {#each sentence.tags.split(',') as tag}
            <span class="tag">{tag.trim()}</span>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  
  {#if words.length > 0}
    <div class="vocabulary-section">
      <h2>Vocabulary</h2>
      <div class="vocabulary-list">
        {#each words as word}
          <div class="vocabulary-item">
            <div class="vocab-word">{word.vocabulary.word}</div>
            <div class="vocab-reading">{word.vocabulary.reading}</div>
            {#if word.vocabulary.meaning}
              <div class="vocab-meaning">{word.vocabulary.meaning}</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  {#if furiganaItems && furiganaItems.length > 0}
    <div class="furigana-section">
      <div class="section-header">
        <h2>Furigana</h2>
        <button onclick={toggleFuriganaEditor} class="btn-secondary">
          {showFuriganaEditor ? 'Hide Editor' : 'Edit Furigana'}
        </button>
      </div>
      
      {#if showFuriganaEditor}
        <FuriganaEditor 
          text={sentence.sentence} 
          furiganaData={furiganaItems}
          on:update={handleFuriganaUpdate}
        />
      {/if}
    </div>
  {/if}
  
  <div class="actions-footer">
    <button 
      onclick={generateFurigana} 
      class="btn-primary" 
      disabled={isGeneratingFurigana}
    >
      {#if isGeneratingFurigana}
        Generating Furigana...
      {:else}
        Generate Furigana
      {/if}
    </button>
  </div>
  
  {#if generationError}
    <div class="error-message">
      Error: {generationError}
    </div>
  {/if}
</div>

<style>
  .sentence-detail {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    position: relative;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2.5rem;
  }
  
  .header-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  h1 {
    color: #4a6fa5;
    margin: 0;
  }
  
  .header-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .difficulty {
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
  }
  
  .level-1 {
    background-color: #e9ecef;
    color: #495057;
  }
  
  .level-2 {
    background-color: #d0ebff;
    color: #1971c2;
  }
  
  .level-3 {
    background-color: #b2f2bb;
    color: #2b8a3e;
  }
  
  .level-4 {
    background-color: #ffec99;
    color: #e67700;
  }
  
  .level-5 {
    background-color: #ffc9c9;
    color: #c92a2a;
  }
  
  .date {
    font-size: 0.9rem;
    color: #6c757d;
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .btn-link {
    color: #4a6fa5;
    text-decoration: none;
    padding: 0.5rem 0;
    transition: color 0.2s;
  }
  
  .btn-link:hover {
    color: #3a5985;
    text-decoration: underline;
  }
  
  .btn-secondary {
    background-color: #e9ecef;
    color: #495057;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .btn-secondary:hover {
    background-color: #ced4da;
  }
  
  .btn-danger {
    background-color: #fa5252;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .btn-danger:hover {
    background-color: #e03131;
  }
  
  .btn-danger:disabled {
    background-color: #ffa8a8;
    cursor: not-allowed;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
    margin-right: 8px;
    vertical-align: middle;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .delete-confirmation {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .confirmation-dialog {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    width: 95%;
    max-width: 500px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .confirmation-dialog h2 {
    color: #e03131;
    margin-top: 0;
  }
  
  .confirmation-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .error-message {
    background-color: #fff5f5;
    border-left: 3px solid #e03131;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    color: #e03131;
    border-radius: 0 4px 4px 0;
  }
  
  .error-message p {
    margin: 0;
  }
  
  .error-details {
    font-size: 0.9rem;
    margin-top: 0.5rem !important;
    opacity: 0.8;
  }
  
  .sentence-content {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    margin-bottom: 2rem;
  }
  
  .japanese-text {
    font-size: 1.8rem;
    line-height: 1.8;
    margin-bottom: 2rem;
  }
  
  h2 {
    font-size: 1.2rem;
    color: #4a6fa5;
    margin-top: 0;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }
  
  .translation p {
    font-size: 1.2rem;
    line-height: 1.6;
    margin: 0;
    color: #495057;
  }
  
  .tags-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e9ecef;
  }
  
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .tag {
    background-color: #e9ecef;
    color: #495057;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .vocabulary-section, .furigana-section {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    margin-bottom: 2rem;
  }
  
  .vocabulary-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .vocabulary-item {
    padding: 1rem;
    border-radius: 6px;
    background-color: #f8f9fa;
    border-left: 3px solid #4a6fa5;
  }
  
  .vocab-word {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 0.3rem;
  }
  
  .vocab-reading {
    font-size: 0.95rem;
    color: #6c757d;
    margin-bottom: 0.5rem;
  }
  
  .vocab-meaning {
    font-size: 0.95rem;
    color: #495057;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .actions-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  
  .btn-primary {
    background-color: #4a6fa5;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #3a5985;
  }
  
  .btn-primary:disabled {
    background-color: #adb5bd;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      gap: 1rem;
    }
    
    .header-actions {
      width: 100%;
      justify-content: space-between;
    }
    
    .japanese-text {
      font-size: 1.5rem;
    }
    
    .vocabulary-list {
      grid-template-columns: 1fr;
    }
    
    .section-header {
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }
  }
</style> 