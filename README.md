# YouTube Enhancer for iOS Safari

A userscript designed to improve YouTube functionality in **Safari on iPhone and iPad**.  
The script enables background playback, Picture-in-Picture, ad removal, quality controls, and interface adjustments.  
It operates entirely on the client side and integrates through the **Stay** Safari extension.

---

## Features

### Playback & Interface
- Picture-in-Picture support  
- Improved fullscreen behavior  
- Autoplay and next-video initiation  
- Forced desktop mode (`app=desktop`) for consistent player behavior  

### Background Audio
- Background playback when Safari is minimized or the screen is off  
- Forced unmute with stabilized volume  
- Prevents YouTube from pausing when Safari is not active  

### Ad Handling
- Removes visible ad components using CSS  
- Cleans dynamically injected ad containers  

### User Interface Enhancements
- Floating controls for Quality, PiP, and Fullscreen  
- Quality selector with optional persistent preference  

### Technical Improvements
- SPA-compatible navigation handling  
- Mutation observers for dynamic YouTube elements  
- iOS-optimized Picture-in-Picture handling  
- Autoplay initiation for pages requiring interaction  

---

## Installation (via Stay — Safari Extension)

### 1. Install Stay  
App Store:  
https://apps.apple.com/in/app/stay-for-safari/id1591620171

### 2. Enable Stay in Safari  
Settings → Safari → Extensions → Stay  
- Enable the extension  
- Set **All Websites → Allow**

### 3. Add the Script  
1. Open the Stay app  
2. Select **Add Script → From URL / Remote**  
3. Enter the script URL:  
   https://raw.githubusercontent.com/IM-SPYBOY/YouTube-Enhancer/main/YouTube.js  
4. Save and enable the script

### 4. Start Using  
Open **youtube.com** in Safari.  
The floating controls will load automatically.

---

## Usage Notes
- Recommended for **iOS 15+**  
- Add YouTube to the Home Screen for quick access  
- Refresh once if the interface controls do not appear  
- If the script still fails to load, **close Safari from Recents and reopen it**

---

## Support & Community
- **Updates:** [spyxtube](https://t.me/spyxtube)  
- **Support:** [iOSeXe](https://t.me/iOSeXe)  
- **Community:** [SPY Tube Chat](https://t.me/spytube_chat)  
- **Instagram:** [@mr_spyboy](https://instagram.com/mr_spyboy)

---

## Author
Developed and maintained by **Spyboy**

---

## Disclaimer
This script modifies only the client-side interface in Safari.  
It does not bypass DRM, modify video streams, or enable downloading of restricted content.  
Intended for personal-use interface enhancement.

---

⭐ If you find this useful, consider starring the repository.