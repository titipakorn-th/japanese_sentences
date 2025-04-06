<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import Furigana from '$lib/components/Furigana.svelte';
  
  const { data } = $props<{ data: PageData }>();
  
  // Reactive state
  let mounted = $state(false);
  let sentences = $derived(data.sentences || []);
  
  // Calculate font size based on sentence difficulty level and length
  function getFontSize(difficultyLevel: number | undefined, length: number): string {
    // Default to level 1 if undefined
    const level = difficultyLevel || 1;
    
    // Base size is inversely proportional to difficulty (easier sentences are larger)
    // Reduced base sizes overall
    const baseSize = (6 - level) * 0.6;
    
    // Adjust size based on length (shorter sentences get slightly larger font)
    // More aggressive reduction for longer sentences
    const lengthFactor = Math.max(0.5, Math.min(1.0, 20 / length));
    
    return baseSize * lengthFactor + 'rem';
  }
  
  // Get color based on difficulty level
  function getDifficultyColor(level: number | undefined): string {
    const colors: Record<number, string> = {
      1: '#4a6fa5', // Blue - Easiest
      2: '#3a9c6d', // Green
      3: '#d9a441', // Yellow/Orange
      4: '#e07b39', // Orange
      5: '#c0392b'  // Red - Hardest
    };
    
    // Default to level 1 if undefined
    return colors[level || 1] || colors[1];
  }
  
  // Get random position for the cloud animation effect with better distribution
  function getRandomPosition() {
    // Grid-like positioning to avoid too much overlap
    // Create a 5x5 grid (approximately) and position sentences in cells
    const rows = 5;
    const cols = 5;
    
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    
    // Add some randomness within each cell
    const rowPos = (row * (100 / rows)) + (Math.random() * (100 / rows * 0.6));
    const colPos = (col * (100 / cols)) + (Math.random() * (100 / cols * 0.6));
    
    // Constrain within visible area
    const top = Math.min(Math.max(rowPos, 5), 90); // 5-90%
    const left = Math.min(Math.max(colPos, 5), 90); // 5-90%
    
    return `top: ${top}%; left: ${left}%;`;
  }
  
  // Get a unique delay for the animation
  function getAnimationDelay() {
    return `animation-delay: ${Math.random() * 10}s;`;
  }
  
  // Truncate sentences for the cloud and adjust furigana data
  function processSentenceForCloud(sentence: string, furiganaData: any, maxLength = 30): { text: string, furiganaData: any } {
    if (!furiganaData || sentence.length <= maxLength) {
      return { text: sentence, furiganaData };
    }
    
    let truncatedText = sentence;
    let endIndex = sentence.length;
    
    // Try to truncate at a punctuation mark
    const punctuation = ['.', '。', '!', '！', '?', '？', '、', ',', '，'];
    for (const mark of punctuation) {
      const index = sentence.indexOf(mark, maxLength * 0.6);
      if (index > 0 && index < maxLength) {
        endIndex = index + 1;
        truncatedText = sentence.substring(0, endIndex) + '...';
        break;
      }
    }
    
    // If no punctuation found, truncate at word/character boundary
    if (endIndex === sentence.length && sentence.length > maxLength) {
      endIndex = maxLength;
      truncatedText = sentence.substring(0, endIndex) + '...';
    }
    
    // Parse furigana data if it's a string
    let parsedFurigana = furiganaData;
    if (typeof furiganaData === 'string') {
      try {
        parsedFurigana = JSON.parse(furiganaData);
      } catch (e) {
        console.error('Error parsing furigana data:', e);
        parsedFurigana = [];
      }
    }
    
    // Filter furigana data to only include entries within the truncated text
    const filteredFurigana = Array.isArray(parsedFurigana) 
      ? parsedFurigana.filter(item => item.end <= endIndex)
      : [];
    
    return { 
      text: truncatedText, 
      furiganaData: filteredFurigana 
    };
  }
  
  // Add mounted state for animation purposes
  onMount(() => {
    mounted = true;
  });
</script>

<svelte:head>
  <title>Japanese Learning Toolkit - Sentence Cloud</title>
</svelte:head>

<main class:mounted>
  <h1>Japanese Learning Toolkit</h1>
  
  <p class="intro">
    A visualization of {sentences.length} Japanese sentences. 
    <br>
    Larger text indicates easier sentences, colors represent difficulty levels.
  </p>
  
  <div class="sentence-cloud">
    {#if sentences.length > 0}
      {#each sentences as sentence}
        <a 
          href="/sentences/{sentence.sentenceId}" 
          class="sentence-bubble"
          style="
            font-size: {getFontSize(sentence.difficultyLevel, sentence.sentence.length)};
            color: {getDifficultyColor(sentence.difficultyLevel)};
            {getRandomPosition()}
            {getAnimationDelay()}
          "
          data-difficulty={sentence.difficultyLevel}
          title={sentence.sentence}
        >
          {#if sentence.furiganaData}
            {@const processed = processSentenceForCloud(sentence.sentence, sentence.furiganaData)}
            <Furigana 
              text={processed.text}
              furiganaData={processed.furiganaData}
            />
          {:else}
            {@const processed = processSentenceForCloud(sentence.sentence, null)}
            {processed.text}
          {/if}
        </a>
      {/each}
    {:else}
      <div class="empty-state">
        <p>No sentences found. Add some sentences to see them here!</p>
        <a href="/sentences/new" class="button">Add Your First Sentence</a>
      </div>
    {/if}
  </div>
  
  <div class="actions">
    <a href="/sentences" class="button primary">View All Sentences</a>
    <a href="/sentences/new" class="button secondary">Add New Sentence</a>
  </div>
  
  <div class="legend">
    <h3>Difficulty Levels</h3>
    <div class="legend-items">
      {#each [1, 2, 3, 4, 5] as level}
        <div class="legend-item">
          <span class="color-box" style="background-color: {getDifficultyColor(level)};"></span>
          <span class="level-text">Level {level}</span>
        </div>
      {/each}
    </div>
  </div>
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 80vh;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }
  
  main.mounted {
    opacity: 1;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  .intro {
    text-align: center;
    margin-bottom: 3rem;
    color: #666;
    font-size: 1.1rem;
  }
  
  .sentence-cloud {
    position: relative;
    min-height: 80vh;
    margin-bottom: 2rem;
    border-radius: 12px;
    background-color: #f9f9f9;
    padding: 2rem;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }
  
  .sentence-bubble {
    position: absolute;
    display: inline-block;
    text-decoration: none;
    padding: 0.8rem;
    border-radius: 8px;
    transition: all 0.3s ease;
    opacity: 0.85;
    z-index: 1;
    max-width: 500px;
    text-align: center;
    animation: float 20s ease-in-out infinite;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 200px;
    line-height: 1.4;
    background-color: rgba(255, 255, 255, 0.5);
  }
  
  .sentence-bubble:hover {
    z-index: 10;
    transform: scale(1.05);
    opacity: 1;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    background-color: rgba(255, 255, 255, 0.95);
    max-height: none;
    overflow: visible;
    white-space: normal;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    color: #999;
    text-align: center;
  }
  
  .empty-state p {
    margin-bottom: 1.5rem;
    font-size: 1.2rem;
  }
  
  .actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .button.primary {
    background-color: #4a6fa5;
    color: white;
  }
  
  .button.primary:hover {
    background-color: #3a5d97;
  }
  
  .button.secondary {
    background-color: #e9ecef;
    color: #495057;
  }
  
  .button.secondary:hover {
    background-color: #dee2e6;
  }
  
  .legend {
    margin-top: 2rem;
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .legend h3 {
    text-align: center;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    color: #555;
  }
  
  .legend-items {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .color-box {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 3px;
  }
  
  .level-text {
    font-size: 0.9rem;
    color: #555;
  }
  
  @keyframes float {
    0% {
      transform: translate(0, 0);
    }
    25% {
      transform: translate(-5px, 3px);
    }
    50% {
      transform: translate(3px, -3px);
    }
    75% {
      transform: translate(-3px, -5px);
    }
    100% {
      transform: translate(0, 0);
    }
  }
  
  @media (max-width: 768px) {
    .sentence-cloud {
      min-height: 80vh;
    }
    
    .legend-items {
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
  }
</style>
