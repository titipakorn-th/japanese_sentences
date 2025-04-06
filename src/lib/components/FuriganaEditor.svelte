<!--
  FuriganaEditor.svelte - Component for editing and correcting furigana readings
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FuriganaItem } from '$lib/db/types';
  import { updateFuriganaViaApi } from '$lib/services/api-service';
  import { updateSentenceFurigana } from '$lib/services/api-service';
  
  const { text, furiganaData = [] } = $props<{
    text: string;
    furiganaData?: FuriganaItem[];
  }>();
  
  const dispatch = createEventDispatcher();
  
  // State for currently edited item
  let editingIndex = $state<number | null>(null);
  let currentReading = $state('');
  let isSaving = $state(false);
  let errorMessage = $state('');
  
  // Check if a character is a kanji
  function isKanji(char: string): boolean {
    const code = char.charCodeAt(0);
    // CJK Unified Ideographs range for common kanji
    return (code >= 0x4E00 && code <= 0x9FFF);
  }
  
  // Start editing a furigana item
  function startEditing(index: number) {
    editingIndex = index;
    currentReading = furiganaData[index]?.reading || '';
  }
  
  // Cancel editing
  function cancelEditing() {
    editingIndex = null;
    currentReading = '';
    errorMessage = '';
  }
  
  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startEditing(index);
    }
  }
  
  // Save the edited furigana
  async function saveFurigana(index: number, sentenceId?: number) {
    if (isSaving) return;
    
    errorMessage = '';
    isSaving = true;
    
    try {
      // Update the furigana data
      const updatedFuriganaData = [...furiganaData];
      updatedFuriganaData[index] = {
        ...updatedFuriganaData[index],
        reading: currentReading
      };
      
      let success = false;
      
      // If we have a sentenceId, use the updateSentenceFurigana function
      if (sentenceId) {
        success = await updateSentenceFurigana(sentenceId, updatedFuriganaData);
      } else {
        // Otherwise, use the individual update API
        const targetWord = furiganaData[index].text;
        const originalReading = furiganaData[index].reading;
        success = await updateFuriganaViaApi(targetWord, originalReading, currentReading);
      }
      
      if (success) {
        // Update the local state
        dispatch('update', { updatedFurigana: updatedFuriganaData });
        editingIndex = null;
      } else {
        errorMessage = 'Failed to update furigana';
      }
    } catch (error) {
      console.error('Error updating furigana:', error);
      errorMessage = error instanceof Error ? error.message : 'An error occurred';
    } finally {
      isSaving = false;
    }
  }
  
  // Get display text for each furigana item
  function getDisplayText(item: FuriganaItem): string {
    return text.slice(item.start, item.end);
  }
  
  // Check if an item contains kanji (and thus needs furigana)
  function hasKanji(str: string): boolean {
    return Array.from(str).some(isKanji);
  }
</script>

<div class="furigana-editor">
  <h3>Edit Furigana Readings</h3>
  
  {#if errorMessage}
    <div class="error">{errorMessage}</div>
  {/if}
  
  <div class="furigana-list">
    {#each furiganaData as item, index}
      <div class="furigana-item" class:has-reading={item.reading} class:editing={editingIndex === index}>
        <button 
          class="kanji-button" 
          onclick={() => startEditing(index)}
          onkeydown={(e) => handleKeyDown(e, index)}
          aria-label="Edit reading for {item.text}"
        >
          <span class="kanji-text">{item.text}</span>
          <span class="reading">{item.reading}</span>
        </button>
        
        {#if editingIndex === index}
          <div class="edit-form">
            <input 
              type="text" 
              bind:value={currentReading} 
              placeholder="Enter reading"
            />
            <div class="edit-actions">
              <button 
                class="btn-save" 
                onclick={() => saveFurigana(index, parseInt(window.location.pathname.split('/')[2]))}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button class="btn-cancel" onclick={cancelEditing}>Cancel</button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  
  {#if furiganaData.length === 0}
    <div class="empty-state">
      No furigana data available. Generate furigana first.
    </div>
  {/if}
</div>

<style>
  .furigana-editor {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #f9f9f9;
    border-radius: 8px;
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    color: #4a6fa5;
  }
  
  .furigana-list {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .furigana-item {
    position: relative;
    padding: 0.5rem;
    border-radius: 4px;
    background-color: white;
    border: 1px solid #e9ecef;
    transition: all 0.2s;
  }
  
  .furigana-item:hover {
    border-color: #4a6fa5;
  }
  
  .furigana-item.editing {
    border-color: #4a6fa5;
    box-shadow: 0 0 0 2px rgba(74, 111, 165, 0.2);
  }
  
  .furigana-item.has-reading {
    background-color: #f0f7ff;
  }
  
  .kanji-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem 1rem;
    text-align: center;
  }
  
  .kanji-text {
    font-size: 1.5rem;
    line-height: 1.5;
  }
  
  .reading {
    font-size: 0.9rem;
    color: #6c757d;
    margin-top: 0.2rem;
  }
  
  .edit-form {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #e9ecef;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }
  
  input:focus {
    border-color: #4a6fa5;
    box-shadow: 0 0 0 2px rgba(74, 111, 165, 0.2);
    outline: none;
  }
  
  .edit-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .btn-save, .btn-cancel {
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    border: none;
    font-size: 0.9rem;
    cursor: pointer;
  }
  
  .btn-save {
    background-color: #4a6fa5;
    color: white;
  }
  
  .btn-save:hover:not(:disabled) {
    background-color: #3a5985;
  }
  
  .btn-save:disabled {
    background-color: #adb5bd;
    cursor: not-allowed;
  }
  
  .btn-cancel {
    background-color: #e9ecef;
    color: #495057;
  }
  
  .btn-cancel:hover {
    background-color: #ced4da;
  }
  
  .error {
    background-color: #fff5f5;
    border-left: 3px solid #e03131;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    color: #e03131;
    border-radius: 0 4px 4px 0;
  }
  
  .empty-state {
    padding: 1rem;
    text-align: center;
    color: #6c757d;
    font-style: italic;
  }
</style> 