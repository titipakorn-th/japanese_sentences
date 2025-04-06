<!--
  FuriganaEditor.svelte - Component for editing and correcting furigana readings
-->
<script lang="ts">
  import { updateFuriganaViaApi } from '$lib/services/api-service';
  import type { FuriganaItem } from '$lib/db/types';
  
  // Component props
  const { 
    text, 
    furiganaData = [],
    updateCallback = undefined
  } = $props<{ 
    text: string; 
    furiganaData?: FuriganaItem[];
    updateCallback?: (updatedFurigana: FuriganaItem[]) => void;  
  }>();
  
  // Component state
  let editingIndex = $state(-1);
  let currentReading = $state('');
  let isSaving = $state(false);
  let errorMessage = $state('');
  let successMessage = $state('');
  
  // Computed values
  const displayItems = $derived(furiganaData.map(item => {
    // Get the actual text for this item from the original sentence
    const actualText = text.slice(item.start, item.end);
    return {
      ...item,
      displayText: actualText
    };
  }));
  
  // Start editing a furigana item
  function startEditing(index: number) {
    editingIndex = index;
    const item = furiganaData[index];
    if (item) {
      currentReading = item.reading || '';
    }
    // Clear any messages
    errorMessage = '';
    successMessage = '';
  }
  
  // Cancel editing
  function cancelEditing() {
    editingIndex = -1;
    currentReading = '';
    errorMessage = '';
  }
  
  // Handle key events for accessibility
  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') {
      if (editingIndex === index) {
        // If already editing, save on Enter
        saveFurigana();
      } else {
        // Otherwise start editing
        startEditing(index);
      }
    } else if (event.key === 'Escape' && editingIndex === index) {
      cancelEditing();
    }
  }
  
  // Save the updated furigana reading
  async function saveFurigana() {
    if (editingIndex < 0 || editingIndex >= furiganaData.length || isSaving) {
      return;
    }
    
    const item = furiganaData[editingIndex];
    const targetText = text.slice(item.start, item.end);
    const originalReading = item.reading || '';
    
    // Don't save if nothing changed
    if (currentReading === originalReading) {
      cancelEditing();
      return;
    }
    
    isSaving = true;
    errorMessage = '';
    
    try {
      console.log('Updating furigana:', {
        text: targetText,
        originalReading,
        newReading: currentReading
      });
      
      // Call API to update furigana
      const success = await updateFuriganaViaApi(
        targetText,
        originalReading,
        currentReading
      );
      
      if (success) {
        // Create new array with updated furigana
        const updatedFurigana = [...furiganaData];
        updatedFurigana[editingIndex] = {
          ...item,
          reading: currentReading
        };
        
        // Show success message
        successMessage = `Updated reading for "${targetText}" to "${currentReading}"`;
        
        // Call the callback to update parent component
        if (updateCallback) {
          updateCallback(updatedFurigana);
        }
        
        // Reset editing state after a brief delay
        setTimeout(() => {
          editingIndex = -1;
          currentReading = '';
        }, 1000);
      } else {
        errorMessage = 'Failed to update furigana. Please try again.';
      }
    } catch (error) {
      console.error('Error saving furigana:', error);
      errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred while saving.';
    } finally {
      isSaving = false;
    }
  }
  
  // Get context for a word in the sentence
  function getContextText(item: FuriganaItem): string {
    // Show some text around the word for context
    const contextStart = Math.max(0, item.start - 5);
    const contextEnd = Math.min(text.length, item.end + 5);
    
    let result = '';
    if (contextStart > 0) result += '...';
    result += text.slice(contextStart, item.start);
    result += `<strong>${text.slice(item.start, item.end)}</strong>`;
    result += text.slice(item.end, contextEnd);
    if (contextEnd < text.length) result += '...';
    
    return result;
  }
</script>

<div class="furigana-editor">
  <h3>Edit Furigana Readings</h3>
  
  {#if errorMessage}
    <div class="error-message" role="alert">
      <span class="message-icon">⚠️</span>
      <span>{errorMessage}</span>
    </div>
  {/if}
  
  {#if successMessage}
    <div class="success-message" role="status">
      <span class="message-icon">✓</span>
      <span>{successMessage}</span>
    </div>
  {/if}
  
  <div class="furigana-list">
    {#each displayItems as item, index}
      {@const displayText = item.displayText}
      {@const reading = item.reading || ''}
      
      <div 
        class="furigana-item {editingIndex === index ? 'editing' : ''}"
        tabindex="0"
        onclick={() => startEditing(index)}
        onkeydown={(e) => handleKeyDown(e, index)}
        role="button"
        aria-label="Edit reading for {displayText}"
      >
        <div class="item-info">
          <div class="item-header">
            <span class="kanji">{displayText}</span>
            <span class="reading">{reading}</span>
          </div>
          
          <div class="item-context">
            <small>{@html getContextText(item)}</small>
          </div>
        </div>
        
        {#if editingIndex === index}
          <div class="edit-form">
            <label for="reading-input-{index}">
              Edit reading for "{displayText}"
            </label>
            
            <input 
              id="reading-input-{index}"
              type="text" 
              bind:value={currentReading} 
              placeholder="Enter hiragana reading"
              autofocus
              onkeydown={(e) => e.key === 'Enter' && saveFurigana()}
            />
            
            <div class="edit-actions">
              <button 
                onclick={() => saveFurigana()} 
                disabled={isSaving || !currentReading.trim()}
                class="btn-save"
                type="button"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              
              <button 
                onclick={cancelEditing}
                disabled={isSaving} 
                class="btn-cancel"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  
  {#if displayItems.length === 0}
    <p class="no-data">No furigana data available for this sentence.</p>
  {/if}
  
  <div class="help-text">
    <p>Click on any word to edit its reading. Changes will be saved to the database.</p>
  </div>
</div>

<style>
  .furigana-editor {
    margin: 1rem 0;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }
  
  .furigana-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .furigana-item {
    padding: 0.75rem;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .furigana-item:hover {
    background-color: #f0f4f8;
    border-color: #c0c0c0;
    transform: translateY(-2px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  }
  
  .furigana-item.editing {
    background-color: #f0f7ff;
    border-color: #90c3ff;
    box-shadow: 0 0 0 2px rgba(144, 195, 255, 0.4);
  }
  
  .item-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .kanji {
    font-weight: bold;
    font-size: 1.3rem;
  }
  
  .reading {
    color: #666;
    font-size: 1rem;
  }
  
  .item-context {
    font-size: 0.85rem;
    color: #666;
    line-height: 1.4;
    border-top: 1px dashed #e0e0e0;
    padding-top: 0.5rem;
    margin-top: 0.25rem;
  }
  
  .item-context strong {
    background-color: #fff8e1;
    padding: 0 2px;
    border-radius: 2px;
  }
  
  .edit-form {
    margin-top: 0.75rem;
    border-top: 1px solid #e0e0e0;
    padding-top: 0.75rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: #555;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    font-size: 1rem;
  }
  
  input:focus {
    outline: none;
    border-color: #4a6fa5;
    box-shadow: 0 0 0 3px rgba(74, 111, 165, 0.1);
  }
  
  .edit-actions {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
    flex: 1;
  }
  
  .btn-save {
    background-color: #4caf50;
    color: white;
  }
  
  .btn-save:hover:not(:disabled) {
    background-color: #388e3c;
    transform: translateY(-1px);
  }
  
  .btn-save:disabled {
    background-color: #9e9e9e;
    cursor: not-allowed;
  }
  
  .btn-cancel {
    background-color: #f44336;
    color: white;
  }
  
  .btn-cancel:hover:not(:disabled) {
    background-color: #d32f2f;
    transform: translateY(-1px);
  }
  
  .btn-cancel:disabled {
    background-color: #9e9e9e;
    cursor: not-allowed;
  }
  
  .message-icon {
    margin-right: 0.5rem;
  }
  
  .error-message {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: #ffebee;
    border-left: 4px solid #f44336;
    color: #b71c1c;
    display: flex;
    align-items: center;
    border-radius: 0 0.25rem 0.25rem 0;
  }
  
  .success-message {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: #e8f5e9;
    border-left: 4px solid #4caf50;
    color: #2e7d32;
    display: flex;
    align-items: center;
    border-radius: 0 0.25rem 0.25rem 0;
  }
  
  .no-data {
    color: #757575;
    text-align: center;
    font-style: italic;
    margin: 2rem 0;
  }
  
  .help-text {
    color: #757575;
    font-size: 0.875rem;
    border-top: 1px solid #e0e0e0;
    padding-top: 0.75rem;
  }
</style> 