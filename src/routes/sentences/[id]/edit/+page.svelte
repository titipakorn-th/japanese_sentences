<!--
  Edit Sentence Page - component for editing an existing sentence
-->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { PageData } from './$types';
  import type { Sentence } from '$lib/db/types';
  import { browser } from '$app/environment';
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import Furigana from '$lib/components/Furigana.svelte';
  
  const { data } = $props<{ data: PageData }>();
  
  const sentence = $derived(data.sentence as Sentence);
  
  let sentenceText = $state(sentence.sentence || '');
  let translation = $state(sentence.translation || '');
  let difficultyLevel = $state(sentence.difficultyLevel || 1);
  let tags = $state(sentence.tags || '');
  
  let submitting = $state(false);
  let showFurigana = $state(true);
  let error = $state('');
  let loading = $state(false);
  
  // This effect will run when the sentence data changes
  $effect(() => {
    sentenceText = sentence.sentence || '';
    translation = sentence.translation || '';
    difficultyLevel = sentence.difficultyLevel || 1;
    tags = sentence.tags || '';
  });
  
  // Ensure difficultyLevel is valid
  $effect(() => {
    if (isNaN(difficultyLevel) || difficultyLevel < 1 || difficultyLevel > 5) {
      difficultyLevel = 1;
    }
    // For debugging
    console.log('Current difficultyLevel is:', difficultyLevel, 'type:', typeof difficultyLevel);
  });
  
  const isValid = $derived(sentenceText.trim().length > 0);
  
  // Difficulty level options
  const difficultyLevels = [
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Elementary' },
    { value: 3, label: 'Intermediate' },
    { value: 4, label: 'Advanced' },
    { value: 5, label: 'Expert' }
  ];
  
  // Toggle furigana display
  function toggleFurigana() {
    showFurigana = !showFurigana;
  }
  
  // Submit handler for cancel button
  function handleCancel() {
    goto(`${base}/sentences/${sentence.sentenceId}`);
  }
  
  // Handle difficulty change from select element
  function handleDifficultyChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newValue = parseInt(select.value);
    difficultyLevel = newValue;
    console.log('Difficulty changed to:', difficultyLevel, 'type:', typeof difficultyLevel);
  }
  
  // Handle form submission
  function handleSubmit() {
    console.log('Form submitted with difficultyLevel:', difficultyLevel);
  }
</script>

<svelte:head>
  <title>Edit Sentence | Japanese Learning</title>
</svelte:head>

<div class="container">
  <div class="header">
    <h1>Edit Sentence</h1>
    <div class="actions">
      {#if sentence.sentenceId}
        <a href="{base}/sentences/{sentence.sentenceId}" class="button secondary">
          Cancel
        </a>
      {:else}
        <a href="{base}/sentences" class="button secondary">
          Back to Sentences
        </a>
      {/if}
    </div>
  </div>
  
  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}
  
  {#if loading}
    <div class="loading">
      <p>Loading sentence data...</p>
    </div>
  {:else if !data?.sentence}
    <div class="error-message">
      Failed to load sentence data. <a href="{base}/sentences">Return to sentences list</a>
    </div>
  {:else}
    <form
      method="POST"
      use:enhance={({ formData, cancel }) => {
        submitting = true;
        error = '';
        
        // Explicitly set the form data values to ensure they're correct
        formData.set('sentence', sentenceText);
        formData.set('translation', translation || '');
        
        // Get the current value directly from the select element to ensure accuracy
        const difficultySelect = document.getElementById('difficultyLevel') as HTMLSelectElement;
        const selectedValue = difficultySelect ? difficultySelect.value : difficultyLevel.toString();
        
        formData.set('difficultyLevel', selectedValue);
        formData.set('tags', tags || '');
        
        // Log form values for debugging
        console.log('Submitting form with values:', {
          sentenceText: formData.get('sentence'),
          translation: formData.get('translation'),
          difficultyLevel: formData.get('difficultyLevel'),
          tags: formData.get('tags')
        });
        
        return ({ result, update }) => {
          console.log('Form submission result:', result);
          submitting = false;
          
          if (result.type === 'success' || result.type === 'redirect') {
            // For redirects, update the page without preventing navigation
            update({ reset: false });
            console.log('Form submission successful, allowing redirect...');
          } else if (result.type === 'failure') {
            error = result.data?.error?.toString() || 'Failed to update sentence';
            console.error('Form submission failed:', result.data);
          } else if (result.type === 'error') {
            error = 'An unexpected error occurred';
            console.error('Form submission error:', result);
          }
        };
      }}
      on:submit={handleSubmit}
    >
      <div class="form-group">
        <label for="sentence">
          Sentence (Japanese) <span class="required">*</span>
        </label>
        <textarea
          id="sentence"
          name="sentence"
          required
          bind:value={sentenceText}
          rows="3"
          placeholder="Enter a Japanese sentence"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="translation">
          Translation (English)
        </label>
        <textarea
          id="translation"
          name="translation"
          bind:value={translation}
          rows="2"
          placeholder="Enter an English translation"
        ></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="difficultyLevel">
            Difficulty Level
          </label>
          <select
            id="difficultyLevel"
            name="difficultyLevel"
            class="form-input mt-1 block w-full"
            on:change={handleDifficultyChange}
          >
            <option value="1" selected={difficultyLevel === 1}>Beginner (1)</option>
            <option value="2" selected={difficultyLevel === 2}>Elementary (2)</option>
            <option value="3" selected={difficultyLevel === 3}>Intermediate (3)</option>
            <option value="4" selected={difficultyLevel === 4}>Advanced (4)</option>
            <option value="5" selected={difficultyLevel === 5}>Expert (5)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="tags">
            Tags (comma separated)
          </label>
          <input
            type="text"
            id="tags"
            name="tags"
            bind:value={tags}
            placeholder="grammar,verb,etc"
          />
        </div>
      </div>
      
      <div class="form-actions">
        {#if isValid}
          <button type="submit" class="button submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        {:else}
          <button type="button" class="button submit" disabled={true}>
            Sentence text is required
          </button>
        {/if}
        {#if sentence.sentenceId}
          <a href="{base}/sentences/{sentence.sentenceId}" class="button secondary">
            Cancel
          </a>
        {/if}
      </div>
    </form>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  h1 {
    font-size: 1.8rem;
    margin: 0;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
    width: 100%;
  }
  
  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .required {
    color: crimson;
  }
  
  input[type="text"],
  textarea,
  select {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
  }
  
  textarea {
    resize: vertical;
  }
  
  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
    border-left: 4px solid #c62828;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s;
  }
  
  .button.primary {
    background-color: #4a69bd;
    color: white;
  }
  
  .button.primary:hover {
    background-color: #1e3799;
  }
  
  .button.secondary {
    background-color: #f1f2f6;
    color: #333;
  }
  
  .button.secondary:hover {
    background-color: #dfe4ea;
  }
  
  .button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .loading {
    padding: 2rem;
    text-align: center;
    font-size: 1.1rem;
    color: #666;
  }
</style> 