/**
 * Simulates performing OCR on an image to extract text.
 * In a real application, this would use a library like Tesseract.js
 * or call a cloud OCR service.
 * @param _imageData Base64 encoded image data (ignored in this mock).
 * @returns A promise that resolves to the extracted mock text.
 */
export const extractTextFromImage = async (_imageData: string): Promise<string> => {
  console.log("Simulating OCR process...");

  // Simulate network/processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const mockBriefs = [
    "We need a soundtrack for a futuristic racing game. Think Blade Runner meets Fast & Furious. The vibe should be dark, energetic, and synth-heavy. Target BPM around 150. Key: F Minor.",
    "Client: Lo-fi Beats Co.\nProject: 'Midnight Study' Playlist\nBrief: Create a chill, dreamy lo-fi hip hop track. Must include a gentle piano melody, dusty drum samples, and a warm bassline. Mood should be relaxing and introspective. BPM: 70-85.",
    "Looking for a powerful, cinematic orchestral piece for a movie trailer. The theme is 'epic struggle and final victory'. Needs a big build-up with strings, brass, and heavy percussion. Think Hans Zimmer style.",
    "Email from Sarah:\nSubject: New Ad Campaign\n\nHey team,\n\nThe new soda ad needs a really upbeat, poppy, and fun track. Something that makes you want to dance. We're targeting a Gen Z audience, so maybe something with a bit of a hyperpop influence? Let's aim for 130 BPM. Thanks!",
  ];

  const randomBrief = mockBriefs[Math.floor(Math.random() * mockBriefs.length)];

  console.log("OCR simulation complete.");
  return randomBrief;
};
