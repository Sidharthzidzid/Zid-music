/* ============================================
   SonicWave — Music Player Application Logic
   ============================================ */

// Override Page Visibility API to keep YouTube iframe playing in background/lock screen
try {
    Object.defineProperty(document, 'hidden', {
        value: false,
        writable: false
    });
    Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: false
    });
    document.addEventListener('visibilitychange', (e) => {
        e.stopImmediatePropagation();
    }, true);
} catch (e) {
    console.warn('Failed to override visibility API:', e);
}

// ========== API Configuration ==========
const API_BASE_URLS = [
    'https://nepotuneapi.vercel.app/api',
    'https://jiosaavn-api-wine.vercel.app/api',
    'https://jiosaavn-api-two.vercel.app/api',
    'https://jiosaavn-api-privatecvc2.vercel.app/api',
    'http://localhost:4000/api',
];



let API_BASE = API_BASE_URLS[0];

// ========== State Management ==========
const state = {
    currentSong: null,
    queue: [],
    queueIndex: -1,
    favorites: JSON.parse(localStorage.getItem('sonicwave_favorites') || '[]'),
    history: JSON.parse(localStorage.getItem('sonicwave_history') || '[]'),
    playlists: JSON.parse(localStorage.getItem('sonicwave_playlists') || '{}'),
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0, // 0: off, 1: all, 2: one
    volume: parseInt(localStorage.getItem('sonicwave_volume') || '80'),
    searchTimeout: null,
    isApiConnected: false,
    lyrics: [],
    isOverlayOpen: false,
    autoplay: localStorage.getItem('sonicwave_autoplay') !== 'false',
    sleepTimerId: null,
    sleepTimeRemaining: 0,
    nextPreloadedId: '',
};

// ========== DOM References ==========
const $ = (id) => document.getElementById(id);
const audio = $('audio-player');

const DOM = {
    searchInput: $('search-input'),
    searchEmpty: $('search-empty'),
    searchSectionsContainer: $('search-sections-container'),
    saavnSearchResults: $('saavn-search-results'),
    youtubeSearchResults: $('youtube-search-results'),
    ytHiddenContainer: $('yt-hidden-container'),
    trendingGrid: $('trending-grid'),
    queueList: $('queue-list'),
    queueEmpty: $('queue-empty'),
    favoritesList: $('favorites-list'),
    favoritesEmpty: $('favorites-empty'),
    historyList: $('history-list'),
    historyEmpty: $('history-empty'),
    clearHistoryBtn: $('clear-history-btn'),
    offlineList: $('offline-list'),
    offlineEmpty: $('offline-empty'),
    playerBar: $('player-bar'),
    playerImg: $('player-img'),
    playerSongName: $('player-song-name'),
    playerArtistName: $('player-artist-name'),
    playerFavBtn: $('player-fav-btn'),
    playerDownloadBtn: $('player-download-btn'),
    playBtn: $('play-btn'),
    playIcon: $('play-icon'),
    pauseIcon: $('pause-icon'),
    prevBtn: $('prev-btn'),
    nextBtn: $('next-btn'),
    shuffleBtn: $('shuffle-btn'),
    repeatBtn: $('repeat-btn'),
    progressContainer: $('progress-container'),
    progressBar: $('progress-bar'),
    progressThumb: $('progress-thumb'),
    currentTime: $('current-time'),
    totalTime: $('total-time'),
    volumeSlider: $('volume-slider'),
    volumeBtn: $('volume-btn'),
    volumeIcon: $('volume-icon'),
    volumeMuteIcon: $('volume-mute-icon'),
    apiStatus: $('api-status'),
    mobileMenuBtn: $('mobile-menu-btn'),
    sidebar: $('sidebar'),
    sidebarOverlay: $('sidebar-overlay'),
    toastContainer: $('toast-container'),
    clearQueueBtn: $('clear-queue-btn'),
    playerOverlay: $('player-overlay'),
    overlayCloseBtn: $('overlay-close-btn'),
    overlaySongImg: $('overlay-song-img'),
    overlayVinylWrapper: $('overlay-vinyl-wrapper'),
    overlayTitle: $('overlay-title'),
    overlayArtist: $('overlay-artist'),
    overlayProgressContainer: $('overlay-progress-container'),
    overlayProgressBar: $('overlay-progress-bar'),
    overlayProgressThumb: $('overlay-progress-thumb'),
    overlayCurrentTime: $('overlay-current-time'),
    overlayTotalTime: $('overlay-total-time'),
    overlayPlayBtn: $('overlay-play-btn'),
    overlayPlayIcon: $('overlay-play-icon'),
    overlayPauseIcon: $('overlay-pause-icon'),
    overlayPrevBtn: $('overlay-prev-btn'),
    overlayNextBtn: $('overlay-next-btn'),
    overlayShuffleBtn: $('overlay-shuffle-btn'),
    overlayRepeatBtn: $('overlay-repeat-btn'),
    overlayFavBtn: $('overlay-fav-btn'),
    overlayDownloadBtn: $('overlay-download-btn'),
    overlayPlaylistBtn: $('overlay-playlist-btn'),
    autoplayToggle: $('autoplay-toggle'),
    overlayVolumeBtn: $('overlay-volume-btn'),
    overlayVolumeIcon: $('overlay-volume-icon'),
    overlayVolumeMuteIcon: $('overlay-volume-mute-icon'),
    overlayVolumeSlider: $('overlay-volume-slider'),
    lyricsContainer: $('lyrics-container'),
    lyricsScrollWrapper: $('lyrics-scroll-wrapper'),
    playerSongInfo: document.querySelector('.player-song-info'),
    personalizedGrid: $('personalized-grid'),
    recommendedSection: $('recommended-section'),
    audioPreloader: $('audio-preloader'),
    overlaySleepBtn: $('overlay-sleep-btn'),
    sleepTimerBadge: $('sleep-timer-badge'),
    sleepDropdown: $('sleep-dropdown'),
    overlayTabLyrics: $('overlay-tab-lyrics'),
    overlayTabQueue: $('overlay-tab-queue'),
    overlayPanelLyrics: $('overlay-panel-lyrics'),
    overlayPanelQueue: $('overlay-panel-queue'),
    overlayQueueContainer: $('overlay-queue-container'),
    
    // Playlists View references
    playlistsGrid: $('playlists-grid'),
    playlistDetails: $('playlist-details'),
    playlistDetailsTitle: $('playlist-details-title'),
    playlistSongsList: $('playlist-songs-list'),
    createPlaylistBtn: $('create-playlist-btn'),
    playlistPlayBtn: $('playlist-play-btn'),
    playlistDeleteBtn: $('playlist-delete-btn'),
    playlistBackBtn: $('playlist-back-btn'),
    
    // Playlist Picker Modal references
    playlistPickerModal: $('playlist-picker-modal'),
    closePlaylistPickerBtn: $('close-playlist-picker-btn'),
    playlistPickerList: $('playlist-picker-list'),
    newPlaylistInput: $('new-playlist-input'),
    createPlaylistSubmitBtn: $('create-playlist-submit-btn'),

    // Voice & Identification references
    searchMicBtn: $('search-mic-btn'),
    listeningOverlay: $('listening-overlay'),
    listeningTitle: $('listening-title'),
    listeningSubtitle: $('listening-subtitle'),
    cancelListeningBtn: $('cancel-listening-btn'),
    navIdentify: $('nav-identify'),
    
    // Artist View references
    viewArtist: $('view-artist'),
    artistNameTitle: $('artist-name-title'),
    artistMetaInfo: $('artist-meta-info'),
    artistPlayAllBtn: $('artist-play-all-btn'),
    artistBackBtn: $('artist-back-btn'),
    artistSongsList: $('artist-songs-list'),
};

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    audio.volume = state.volume / 100;
    DOM.volumeSlider.value = state.volume;
    
    // Set Autoplay checkbox state
    DOM.autoplayToggle.checked = state.autoplay;
    
    await initOfflineDB(); // Initialize local database cache first
    await testApiConnection();
    loadTrending();
    renderFavorites();
    renderHistory();
    loadOfflineLibrary();
    loadPersonalizedRecommendations();

    // Initialize SPA navigation state
    history.replaceState({ view: 'home', playlist: null, overlay: false, lyrics: false }, '');
    window.addEventListener('popstate', handlePopState);

    // Capacitor Native Android Hardware Back Button listener
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        const App = window.Capacitor.Plugins.App;
        App.addListener('backButton', () => {
            const currentState = history.state;
            if (!currentState || (currentState.view === 'home' && !currentState.overlay && !currentState.playlist && !currentState.lyrics)) {
                App.exitApp();
            } else {
                history.back();
            }
        });
    }
}

// ========== API Connection Test ==========
async function testApiConnection() {
    const statusDot = DOM.apiStatus.querySelector('.status-dot');
    const statusText = DOM.apiStatus.querySelector('.status-text');

    for (const url of API_BASE_URLS) {
        try {
            const res = await fetch(`${url}/search/songs?query=test&limit=1`, {
                signal: AbortSignal.timeout(5000),
            });
            if (res.ok) {
                API_BASE = url;
                state.isApiConnected = true;
                statusDot.className = 'status-dot connected';
                statusText.textContent = 'Connected';
                return;
            }
        } catch (e) {
            continue;
        }
    }

    statusDot.className = 'status-dot error';
    statusText.textContent = 'API Unavailable';
    showToast('Could not connect to music API. Please try again later.', 'error');
}

// ========== API Calls ==========
async function searchSongs(query, limit = 20) {
    try {
        const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);
        const data = await res.json();
        if (data.success && data.data && data.data.results) {
            return data.data.results;
        }
        return [];
    } catch (err) {
        console.error('Search error:', err);
        showToast('Search failed. Please try again.', 'error');
        return [];
    }
}

function extractSongData(song) {
    const downloadUrl = song.downloadUrl;
    let audioUrl = '';

    if (Array.isArray(downloadUrl)) {
        // Prefer highest quality
        const quality = downloadUrl.find(d => d.quality === '320kbps')
            || downloadUrl.find(d => d.quality === '160kbps')
            || downloadUrl.find(d => d.quality === '96kbps')
            || downloadUrl[downloadUrl.length - 1];
        audioUrl = quality ? quality.url || quality.link : '';
    } else if (typeof downloadUrl === 'string') {
        audioUrl = downloadUrl;
    }

    const image = song.image;
    let imageUrl = '';
    if (Array.isArray(image)) {
        const img = image.find(i => i.quality === '500x500')
            || image.find(i => i.quality === '150x150')
            || image[image.length - 1];
        imageUrl = img ? img.url || img.link : '';
    } else if (typeof image === 'string') {
        imageUrl = image;
    }

    // Clean HTML entities from names
    const cleanText = (text) => {
        const div = document.createElement('div');
        div.innerHTML = text || '';
        return div.textContent || div.innerText || '';
    };

    const artists = song.artists?.primary
        ? song.artists.primary.map(a => cleanText(a.name)).join(', ')
        : cleanText(song.primaryArtists || song.artist || 'Unknown Artist');

    return {
        id: song.id,
        name: cleanText(song.name || song.title || 'Unknown'),
        artist: artists,
        album: cleanText(song.album?.name || song.album || ''),
        duration: song.duration || 0,
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        year: song.year || '',
        language: song.language || '',
    };
}

// ========== Trending ==========
async function loadTrending() {
    const trendingQueries = ['Latest Hindi Songs', 'Top Hits 2025', 'Trending Bollywood'];
    const randomQuery = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];
    
    const songs = await searchSongs(randomQuery, 12);
    if (songs.length === 0) {
        DOM.trendingGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <p>Could not load trending songs.</p>
            </div>`;
        return;
    }

    DOM.trendingGrid.innerHTML = '';
    songs.forEach((song, index) => {
        const data = extractSongData(song);
        const card = createSongCard(data, index);
        DOM.trendingGrid.appendChild(card);
    });
}

function createSongCard(data) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.innerHTML = `
        <div class="card-art-container">
            <img class="card-art" src="${data.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%231a1a28" width="200" height="200"/%3E%3Ctext x="100" y="110" fill="%234a4a5e" font-size="40" text-anchor="middle"%3E♪%3C/text%3E%3C/svg%3E'}" alt="${data.name}" loading="lazy">
            <div class="card-play-overlay">
                <div class="card-play-btn">
                    <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
            </div>
        </div>
        <div class="card-title" title="${data.name}">${data.name}</div>
        <div class="card-artist" title="${data.artist}"></div>
    `;
    card.addEventListener('click', (e) => {
        if (e.target.closest('.clickable-artist-link')) return;
        playSong(data);
    });
    const artistContainer = card.querySelector('.card-artist');
    if (artistContainer) {
        renderArtistLinks(artistContainer, data.artist);
    }
    return card;
}

// ========== Search ==========


function handleSearch(query) {
    clearTimeout(state.searchTimeout);
    
    if (!query.trim()) {
        DOM.searchEmpty.classList.remove('hidden');
        DOM.searchSectionsContainer.classList.add('hidden');
        switchView('home');
        return;
    }

    switchView('search');
    
    DOM.searchEmpty.classList.add('hidden');
    DOM.searchSectionsContainer.classList.remove('hidden');
    
    DOM.saavnSearchResults.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    state.searchTimeout = setTimeout(async () => {
        const saavnSongs = await searchSongs(query, 12);
        renderSaavnSearchResults(saavnSongs);
    }, 400);
}

function renderSaavnSearchResults(songs) {
    if (songs.length === 0) {
        DOM.saavnSearchResults.innerHTML = `
            <div class="empty-state" style="padding: 40px 10px;">
                <p>No studio tracks found.</p>
            </div>`;
        return;
    }

    DOM.saavnSearchResults.innerHTML = '';
    songs.forEach((song, index) => {
        const data = extractSongData(song);
        const row = createSongRow(data, index + 1, 'search');
        DOM.saavnSearchResults.appendChild(row);
    });
}



// ========== Song Row Component ==========
function createSongRow(data, number, context = 'search') {
    const isFav = state.favorites.some(f => f.id === data.id);
    const isPlaying = state.currentSong && state.currentSong.id === data.id;
    const duration = formatTime(data.duration);
    const isOffline = data.audioUrl.startsWith('songs/');
    let badgeHTML = '';
    if (isOffline) {
        badgeHTML = '<span class="badge badge-offline" style="margin-left: 8px; vertical-align: middle; display: inline-block;">Offline</span>';
    }

    const row = document.createElement('div');
    row.className = `song-row${isPlaying ? ' playing' : ''}`;
    row.dataset.songId = data.id;

    row.innerHTML = `
        <div class="row-number">
            ${isPlaying 
                ? '<div class="equalizer"><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>' 
                : `<span class="row-number-text">${number}</span><svg class="row-play-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
            }
        </div>
        <div class="row-art">
            <img src="${data.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"%3E%3Crect fill="%231a1a28" width="48" height="48"/%3E%3Ctext x="24" y="30" fill="%234a4a5e" font-size="18" text-anchor="middle"%3E♪%3C/text%3E%3C/svg%3E'}" alt="${data.name}" loading="lazy">
        </div>
        <div class="row-info">
            <div class="row-title">${data.name}${badgeHTML}</div>
            <div class="row-artist"></div>
        </div>
        <div class="row-album">${data.album}</div>
        <div class="row-duration">${duration}</div>
        <div class="row-actions">
            <button class="btn-icon fav-btn${isFav ? ' active' : ''}" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            ${context === 'offline'
                ? `<button class="btn-icon delete-offline-btn" title="Delete Offline Song">
                       <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                   </button>`
                : `<button class="btn-icon download-btn" title="Download Audio">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                   </button>`
            }
            <button class="btn-icon add-queue-btn" title="Add to Queue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="btn-icon create-radio-btn" title="Start Song Radio">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
            </button>
            ${context === 'playlist-detail' 
                ? `<button class="btn-icon remove-playlist-song-btn" title="Remove from Playlist">
                       <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                   </button>`
                : `<button class="btn-icon add-playlist-btn" title="Add to Playlist">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="6" x2="18" y2="6"/><line x1="3" y1="18" x2="15" y2="18"/><line x1="19" y1="13" x2="19" y2="19"/><line x1="16" y1="16" x2="22" y2="16"/></svg>
                   </button>`
            }
        </div>
    `;

    // Click to play
    row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-icon') || e.target.closest('.clickable-artist-link')) return;
        playSong(data);
    });

    // Clickable artist link
    const artistContainer = row.querySelector('.row-artist');
    if (artistContainer) {
        renderArtistLinks(artistContainer, data.artist);
    }

    // Favorite button
    const favBtn = row.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(data);
        const isNowFav = state.favorites.some(f => f.id === data.id);
        favBtn.classList.toggle('active', isNowFav);
        favBtn.querySelector('svg').setAttribute('fill', isNowFav ? 'currentColor' : 'none');
    });

    // Add to queue button
    const queueBtn = row.querySelector('.add-queue-btn');
    queueBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToQueue(data);
    });

    // Start Song Radio button
    const radioBtn = row.querySelector('.create-radio-btn');
    if (radioBtn) {
        radioBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            createTrackRadio(data);
        });
    }

    // Playlist Add/Remove button
    if (context === 'playlist-detail') {
        const removeSongBtn = row.querySelector('.remove-playlist-song-btn');
        removeSongBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Get active playlist name from DOM header or logic state
            const playlistName = DOM.playlistDetailsTitle.textContent;
            removeSongFromPlaylist(playlistName, data.id);
        });
    } else {
        const addPlaylistBtn = row.querySelector('.add-playlist-btn');
        addPlaylistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPlaylistPicker(data);
        });
    }

    // Download / Delete button
    if (context === 'offline') {
        const deleteBtn = row.querySelector('.delete-offline-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${data.name}" from offline downloads?`)) {
                await deleteOfflineSong(data.id);
                showToast(`Deleted "${data.name}" successfully!`, 'success');
                loadOfflineLibrary();
            }
        });
    } else {
        const dlBtn = row.querySelector('.download-btn');
        dlBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDownload(data);
        });
    }

    return row;
}



// ========== Playback ==========
function playSong(songData) {
    if (!songData.audioUrl) {
        showToast('This song is not available for playback.', 'error');
        return;
    }

    state.currentSong = songData;
    state.nextPreloadedId = '';
    applyDynamicBackground(songData);
    loadLyrics(songData);
    renderOverlayQueue();

    // Add to played history
    let newHistory = state.history.filter(s => s.id !== songData.id);
    newHistory.unshift(songData);
    if (newHistory.length > 20) {
        newHistory = newHistory.slice(0, 20);
    }
    state.history = newHistory;
    localStorage.setItem('sonicwave_history', JSON.stringify(state.history));
    renderHistory();
    loadPersonalizedRecommendations();

    // Add to queue if not already present or update index
    const existingIndex = state.queue.findIndex(s => s.id === songData.id);
    if (existingIndex >= 0) {
        state.queueIndex = existingIndex;
    } else {
        state.queue.push(songData);
        state.queueIndex = state.queue.length - 1;
    }

    audio.src = songData.audioUrl;
    audio.play().then(() => {
        state.isPlaying = true;
        updatePlayerUI();
        updatePlayButton();
        updateMediaSession();
    }).catch(err => {
        console.error('Saavn playback error:', err);
        showToast('Could not play this song. Trying next...', 'error');
        setTimeout(playNext, 1500);
    });

    // Show player bar
    DOM.playerBar.classList.remove('hidden');
    
    // Update all views
    updateActiveSongHighlight();
    renderQueue();
}

function togglePlay() {
    if (!state.currentSong) return;

    if (audio.paused) {
        audio.play();
        state.isPlaying = true;
    } else {
        audio.pause();
        state.isPlaying = false;
    }
    updatePlayButton();
    updateMediaSession();
}

function playNext() {
    if (state.queue.length === 0) return;

    if (state.isShuffle) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * state.queue.length);
        } while (randomIndex === state.queueIndex && state.queue.length > 1);
        state.queueIndex = randomIndex;
    } else {
        state.queueIndex = (state.queueIndex + 1) % state.queue.length;
    }

    playSong(state.queue[state.queueIndex]);
}

function playPrev() {
    if (state.queue.length === 0) return;

    // If more than 3 seconds in, restart the song
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }

    if (state.isShuffle) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * state.queue.length);
        } while (randomIndex === state.queueIndex && state.queue.length > 1);
        state.queueIndex = randomIndex;
    } else {
        state.queueIndex = (state.queueIndex - 1 + state.queue.length) % state.queue.length;
    }

    playSong(state.queue[state.queueIndex]);
}

// ========== Queue Management ==========
function addToQueue(songData) {
    const exists = state.queue.some(s => s.id === songData.id);
    if (!exists) {
        state.queue.push(songData);
        showToast(`Added "${songData.name}" to queue`, 'success');
        renderQueue();
    } else {
        showToast('Song is already in queue', 'info');
    }
}

function removeFromQueue(index) {
    if (index === state.queueIndex) {
        showToast("Can't remove the currently playing song", 'info');
        return;
    }
    state.queue.splice(index, 1);
    if (index < state.queueIndex) state.queueIndex--;
    renderQueue();
}

function clearQueue() {
    const current = state.currentSong;
    state.queue = current ? [current] : [];
    state.queueIndex = current ? 0 : -1;
    renderQueue();
    showToast('Queue cleared', 'info');
}

function renderQueue() {
    if (state.queue.length === 0) {
        DOM.queueList.innerHTML = '';
        DOM.queueList.appendChild(DOM.queueEmpty.cloneNode(true));
        return;
    }

    DOM.queueList.innerHTML = '';
    state.queue.forEach((song, index) => {
        const row = createSongRow(song, index + 1, 'queue');
        DOM.queueList.appendChild(row);
    });
}

// ========== Favorites ==========
function toggleFavorite(songData) {
    const index = state.favorites.findIndex(f => f.id === songData.id);
    if (index >= 0) {
        state.favorites.splice(index, 1);
        showToast(`Removed from favorites`, 'info');
    } else {
        state.favorites.push(songData);
        showToast(`Added to favorites`, 'success');
    }
    localStorage.setItem('sonicwave_favorites', JSON.stringify(state.favorites));
    updatePlayerFavButton();
    renderFavorites();
    loadPersonalizedRecommendations();
}

function renderFavorites() {
    if (state.favorites.length === 0) {
        DOM.favoritesList.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <p>No favorites yet. Tap the heart icon on a song to save it!</p>`;
        DOM.favoritesList.appendChild(empty);
        return;
    }

    DOM.favoritesList.innerHTML = '';
    state.favorites.forEach((song, index) => {
        const row = createSongRow(song, index + 1, 'favorites');
        DOM.favoritesList.appendChild(row);
    });
}

function renderHistory() {
    if (!DOM.historyList) return;
    if (state.history.length === 0) {
        DOM.historyList.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p>No recently played songs. Start listening to build your history!</p>`;
        DOM.historyList.appendChild(empty);
        return;
    }

    DOM.historyList.innerHTML = '';
    state.history.forEach((song, index) => {
        const row = createSongRow(song, index + 1, 'history');
        DOM.historyList.appendChild(row);
    });
}

// ========== IndexedDB Offline Manager ==========
const OFFLINE_DB_NAME = 'ZidMusicOfflineDB';
const OFFLINE_STORE_NAME = 'songs';
let offlineDb = null;
const generatedBlobUrls = new Set();

function initOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(OFFLINE_DB_NAME, 2);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
                db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => {
            offlineDb = e.target.result;
            resolve(offlineDb);
        };
        request.onerror = (e) => {
            console.error('Failed to open IndexedDB:', e.target.error);
            reject(e.target.error);
        };
    });
}

function sanitizeFilename(name) {
    if (!name) return 'unknown';
    return name.replace(/[\\/:*?"<>|]/g, '_');
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.readAsDataURL(blob);
    });
}

function getOfflineSongMetadata(songId) {
    return new Promise((resolve, reject) => {
        if (!offlineDb) return resolve(null);
        const transaction = offlineDb.transaction(OFFLINE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(OFFLINE_STORE_NAME);
        const request = store.get(songId);
        request.onsuccess = (e) => resolve(e.target.result || null);
        request.onerror = (e) => reject(e.target.error);
    });
}

function saveOfflineSong(songData, audioBlob, imageBlob) {
    return new Promise(async (resolve, reject) => {
        if (!offlineDb) return reject('DB not initialized');
        
        let localPath = null;
        
        // Save to public Zid Music folder on external storage if Capacitor Filesystem is available
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
                const Filesystem = window.Capacitor.Plugins.Filesystem;
                const filename = `${sanitizeFilename(songData.name)} - ${sanitizeFilename(songData.artist)}.mp3`;
                localPath = `Zid Music/${filename}`;
                
                showToast(`Saving "${songData.name}" to Zid Music folder...`, 'info');
                const base64Data = await blobToBase64(audioBlob);
                
                // Write with a fallback: if it fails, request permissions and try one more time
                try {
                    await Filesystem.writeFile({
                        path: localPath,
                        data: base64Data,
                        directory: 'EXTERNAL',
                        recursive: true
                    });
                } catch (writeErr) {
                    console.warn('Initial write failed, requesting permissions and trying again...', writeErr);
                    
                    // Request storage permissions
                    try {
                        const check = await Filesystem.checkPermissions();
                        if (check.publicStorage !== 'granted') {
                            await Filesystem.requestPermissions();
                        }
                    } catch (permErr) {
                        console.error('Failed to request storage permissions:', permErr);
                    }
                    
                    // Retry writing file
                    await Filesystem.writeFile({
                        path: localPath,
                        data: base64Data,
                        directory: 'EXTERNAL',
                        recursive: true
                    });
                }
                
                console.log('Saved audio file successfully to public storage:', localPath);
                showToast(`Saved to device storage: Zid Music/${filename}`, 'success');
                // Clear the heavy audioBlob so we do not bloat the IndexedDB database
                audioBlob = null;
            } catch (fsErr) {
                console.error('Failed to save to device filesystem, falling back to local DB cache:', fsErr);
                showToast(`Storage info: ${fsErr.message || fsErr}. Storing inside app instead.`, 'warning');
                localPath = null; // Storing as IndexedDB blob fallback
            }
        }
        
        const transaction = offlineDb.transaction(OFFLINE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(OFFLINE_STORE_NAME);
        
        const record = {
            id: songData.id,
            name: songData.name,
            artist: songData.artist,
            album: songData.album || '',
            duration: songData.duration,
            audioBlob: audioBlob,
            imageBlob: imageBlob,
            localPath: localPath,
            downloadedAt: Date.now()
        };
        
        const request = store.put(record);
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function deleteOfflineSong(songId) {
    // 1. Delete physical file if present on Android
    try {
        const record = await getOfflineSongMetadata(songId);
        if (record && record.localPath && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            const Filesystem = window.Capacitor.Plugins.Filesystem;
            try {
                await Filesystem.deleteFile({
                    path: record.localPath,
                    directory: 'EXTERNAL'
                });
                console.log('Deleted physical audio file:', record.localPath);
            } catch (err) {
                console.warn('Physical file not found or already deleted:', err);
            }
        }
    } catch (e) {
        console.warn('Failed to resolve offline metadata during file deletion:', e);
    }

    // 2. Delete entry from IndexedDB database
    return new Promise((resolve, reject) => {
        if (!offlineDb) return reject('DB not initialized');
        const transaction = offlineDb.transaction(OFFLINE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(OFFLINE_STORE_NAME);
        const request = store.delete(songId);
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

function getOfflineSongs() {
    return new Promise((resolve, reject) => {
        if (!offlineDb) return resolve([]);
        const transaction = offlineDb.transaction(OFFLINE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(OFFLINE_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = (e) => {
            resolve(e.target.result || []);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

function createBlobUrl(blob) {
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    generatedBlobUrls.add(url);
    return url;
}

function clearAllBlobUrls() {
    generatedBlobUrls.forEach(url => URL.revokeObjectURL(url));
    generatedBlobUrls.clear();
}

// ========== Offline Library ==========
async function loadOfflineLibrary() {
    clearAllBlobUrls();
    
    // 1. Fetch pre-loaded offline script database (usually empty now)
    let scriptSongs = [];
    if (window.SONICWAVE_OFFLINE_DB) {
        scriptSongs = window.SONICWAVE_OFFLINE_DB;
    }

    // 2. Fetch downloads stored in IndexedDB
    let localDBSongs = [];
    try {
        const dbSongs = await getOfflineSongs();
        
        // Map songs, and verify if the file still exists if it's on the filesystem
        const mappedSongsPromises = dbSongs.map(async (record) => {
            try {
                const songObj = {
                    id: record.id,
                    name: record.name,
                    artist: record.artist,
                    album: record.album,
                    duration: record.duration,
                    imageUrl: createBlobUrl(record.imageBlob),
                    isOfflineIndexed: true,
                    localPath: record.localPath || null
                };

                if (record.localPath && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
                    try {
                        const Filesystem = window.Capacitor.Plugins.Filesystem;
                        // Check if file exists on disk
                        await Filesystem.stat({
                            path: record.localPath,
                            directory: 'EXTERNAL'
                        });
                        
                        // Get URI and convert to playable web src
                        const uriResult = await Filesystem.getUri({
                            path: record.localPath,
                            directory: 'EXTERNAL'
                        });
                        songObj.audioUrl = window.Capacitor.convertFileSrc(uriResult.uri);
                    } catch (fsErr) {
                        console.warn(`Local file ${record.localPath} not found:`, fsErr);
                        // Safe fallback: if we have audioBlob cached in IndexedDB, use it!
                        if (record.audioBlob) {
                            songObj.audioUrl = createBlobUrl(record.audioBlob);
                        } else {
                            // Otherwise, do not display this song since it cannot be loaded
                            return null;
                        }
                    }
                } else {
                    // Browser/non-filesystem fallback
                    songObj.audioUrl = createBlobUrl(record.audioBlob);
                }

                return songObj;
            } catch (err) {
                console.error('Error loading individual offline song record:', err);
                return null;
            }
        });

        const mappedSongs = await Promise.all(mappedSongsPromises);
        localDBSongs = mappedSongs.filter(song => song !== null);
    } catch (e) {
        console.error('Failed to read offline database records:', e);
    }

    const allOfflineSongs = [...scriptSongs, ...localDBSongs];
    renderOfflineLibrary(allOfflineSongs);
}

function renderOfflineLibrary(songs) {
    if (songs.length === 0) {
        DOM.offlineList.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <p>No offline songs downloaded yet. Click Download on any song to save it here!</p>`;
        DOM.offlineList.appendChild(empty);
        return;
    }

    DOM.offlineList.innerHTML = '';
    songs.forEach((song, index) => {
        const row = createSongRow(song, index + 1, 'offline');
        DOM.offlineList.appendChild(row);
    });
}

// ========== Browser Downloads ==========

async function handleDownload(songData) {
    if (!songData) return;
    
    const isOffline = songData.audioUrl.startsWith('blob:') || songData.audioUrl.startsWith('songs/') || songData.isOfflineIndexed;

    if (isOffline) {
        showToast('This song is already saved offline!', 'info');
        return;
    }

    downloadSaavnSong(songData);
}

async function fetchBlobWithTimeout(url, timeoutMs = 45000) {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) {
        try {
            console.log('Using native CapacitorHttp for download:', url);
            const response = await window.Capacitor.Plugins.CapacitorHttp.get({
                url: url,
                responseType: 'base64',
                connectTimeout: timeoutMs,
                readTimeout: timeoutMs
            });
            if (response && response.data) {
                const byteCharacters = atob(response.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: 'audio/mpeg' });
            }
        } catch (e) {
            console.error('Native CapacitorHttp download failed, falling back to standard fetch:', e);
        }
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return await response.blob();
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

async function downloadSaavnSong(songData) {
    showToast(`Downloading "${songData.name}" offline...`, 'info');
    try {
        // Fetch audio stream
        const audioBlob = await fetchBlobWithTimeout(songData.audioUrl);
        
        // Fetch image blob
        let imageBlob = null;
        if (songData.imageUrl) {
            try {
                imageBlob = await fetchBlobWithTimeout(songData.imageUrl, 8000);
            } catch (imgErr) {
                console.warn('Failed to download custom album art image blob:', imgErr);
            }
        }

        // Save to IndexedDB
        await saveOfflineSong(songData, audioBlob, imageBlob);
        showToast(`"${songData.name}" is now available offline!`, 'success');
        loadOfflineLibrary();
    } catch (err) {
        console.error('Saavn offline download failed:', err);
        showToast('Download failed. Opening stream URL directly in browser...', 'warning');
        window.open(songData.audioUrl, '_blank');
    }
}



// ========== UI Updates ==========
function updatePlayerUI() {
    const song = state.currentSong;
    if (!song) return;

    DOM.playerImg.src = song.imageUrl || '';
    DOM.playerSongName.textContent = song.name;
    renderArtistLinks(DOM.playerArtistName, song.artist);
    updatePlayerFavButton();
    document.title = `${song.name} — Zid Music`;

    // Sync Expanded Player Overlay
    DOM.overlaySongImg.src = song.imageUrl || '';
    DOM.overlayTitle.textContent = song.name;
    renderArtistLinks(DOM.overlayArtist, song.artist);
    
    // Sync vinyl rotation state
    DOM.overlayVinylWrapper.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
    
    // Sync overlay favorite button state
    const isFav = state.favorites.some(f => f.id === song.id);
    DOM.overlayFavBtn.classList.toggle('active', isFav);
    DOM.overlayFavBtn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
}

function updatePlayButton() {
    DOM.playIcon.style.display = state.isPlaying ? 'none' : 'block';
    DOM.pauseIcon.style.display = state.isPlaying ? 'block' : 'none';

    // Sync Overlay Play Buttons
    DOM.overlayPlayIcon.style.display = state.isPlaying ? 'none' : 'block';
    DOM.overlayPauseIcon.style.display = state.isPlaying ? 'block' : 'none';

    // Sync vinyl rotation state
    DOM.overlayVinylWrapper.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
}

function updatePlayerFavButton() {
    if (!state.currentSong) return;
    const isFav = state.favorites.some(f => f.id === state.currentSong.id);
    DOM.playerFavBtn.classList.toggle('active', isFav);
    const svg = DOM.playerFavBtn.querySelector('svg path');
    if (svg) {
        DOM.playerFavBtn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
    }
}

function updateActiveSongHighlight() {
    document.querySelectorAll('.song-row.playing').forEach(row => {
        row.classList.remove('playing');
    });

    if (state.currentSong) {
        document.querySelectorAll(`[data-song-id="${state.currentSong.id}"]`).forEach(row => {
            row.classList.add('playing');
        });
    }
}

function updateProgress() {
    if (state._isDraggingProgress) return;
    if (state.currentSong && state.currentSong.id.toString().startsWith('yt-') && !state.currentYtDirectUrl) {
        return;
    }
    if (!audio.duration) return;

    const percent = (audio.currentTime / audio.duration) * 100;
    DOM.progressBar.style.width = `${percent}%`;
    DOM.progressThumb.style.left = `${percent}%`;
    DOM.currentTime.textContent = formatTime(audio.currentTime);
    DOM.totalTime.textContent = formatTime(audio.duration);

    // Sync Overlay progress
    DOM.overlayProgressBar.style.width = `${percent}%`;
    DOM.overlayProgressThumb.style.left = `${percent}%`;
    DOM.overlayCurrentTime.textContent = formatTime(audio.currentTime);
    DOM.overlayTotalTime.textContent = formatTime(audio.duration);

    // Sync lyrics
    syncLyrics(audio.currentTime);

    // Preload next track
    checkPreload(audio.currentTime, audio.duration);
}

// ========== Media Session API ==========
function updateMediaSession() {
    if (window.ZidMediaInterface && state.currentSong) {
        const duration = audio.duration || 0;
        const position = audio.currentTime || 0;
        
        let ytDuration = 0;
        let ytPosition = 0;
        const isOnlineYt = state.currentSong.audioUrl.startsWith('yt-');
        if (isOnlineYt && ytPlayer && ytPlayerReady) {
            ytDuration = ytPlayer.getDuration() || 0;
            ytPosition = ytPlayer.getCurrentTime() || 0;
        }

        window.ZidMediaInterface.updateMetadata(
            state.currentSong.name,
            state.currentSong.artist,
            state.currentSong.imageUrl || '',
            state.isPlaying,
            Math.round((isOnlineYt ? ytDuration : duration) * 1000),
            Math.round((isOnlineYt ? ytPosition : position) * 1000)
        );
    }

    if (!('mediaSession' in navigator) || !state.currentSong) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: state.currentSong.name,
        artist: state.currentSong.artist,
        album: state.currentSong.album,
        artwork: state.currentSong.imageUrl ? [
            { src: state.currentSong.imageUrl, sizes: '500x500', type: 'image/jpeg' }
        ] : [],
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
}

window.seekAudio = function(time) {
    if (!state.currentSong) return;
    const isOnlineYt = state.currentSong.audioUrl.startsWith('yt-');
    if (isOnlineYt) {
        if (ytPlayer && ytPlayerReady) {
            ytPlayer.seekTo(time, true);
        }
    } else {
        audio.currentTime = time;
    }
    setTimeout(updateMediaSession, 200);
};

// ========== View Navigation ==========
function switchView(viewName, shouldPushState = true) {
    const currentActiveView = document.querySelector('.view.active')?.id?.replace('view-', '') || '';
    if (viewName === currentActiveView && shouldPushState) return;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`view-${viewName}`);
    const nav = document.querySelector(`[data-view="${viewName}"]`);

    if (view) view.classList.add('active');
    if (nav) nav.classList.add('active');

    // Close mobile sidebar
    DOM.sidebar.classList.remove('open');
    DOM.sidebarOverlay.classList.remove('active');

    if (viewName === 'offline') {
        loadOfflineLibrary();
    } else if (viewName === 'history') {
        renderHistory();
    } else if (viewName === 'playlists') {
        renderPlaylists();
    }

    if (shouldPushState) {
        history.pushState({ view: viewName, playlist: null, overlay: false, lyrics: false }, '');
    }
}

// ========== Drag seeking helper ==========
function setupDragSeeking(container, barElement, thumbElement) {
    let isDragging = false;

    function handleDrag(e) {
        if (!state.currentSong) return 0;
        const rect = container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));

        barElement.style.width = `${percent * 100}%`;
        if (thumbElement) {
            thumbElement.style.left = `${percent * 100}%`;
        }
        return percent;
    }

    function startDrag(e) {
        if (!state.currentSong) return;
        isDragging = true;
        state._isDraggingProgress = true;
        handleDrag(e);
        if (e.cancelable) e.preventDefault();
    }

    function moveDrag(e) {
        if (!isDragging) return;
        handleDrag(e);
        if (e.cancelable) e.preventDefault();
    }

    function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        state._isDraggingProgress = false;

        const rect = container.getBoundingClientRect();
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));

        const isOnlineYt = state.currentSong.audioUrl.startsWith('yt-');
        if (isOnlineYt) {
            if (ytPlayer && ytPlayerReady) {
                const duration = ytPlayer.getDuration();
                if (duration) {
                    ytPlayer.seekTo(percent * duration, true);
                }
            }
        } else {
            if (audio.duration) {
                audio.currentTime = percent * audio.duration;
            }
        }
        setTimeout(updateMediaSession, 250);
    }

    container.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);

    container.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
}

// ========== Event Listeners ==========
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.view) {
                switchView(btn.dataset.view);
            }
        });
    });

    // Identify Song Navigation Action
    if (DOM.navIdentify) {
        DOM.navIdentify.addEventListener('click', () => {
            startSongIdentification();
        });
    }

    // Search Microphone Button Action
    if (DOM.searchMicBtn) {
        DOM.searchMicBtn.addEventListener('click', () => {
            startVoiceSearch();
        });
    }

    // Cancel Listening Button Action
    if (DOM.cancelListeningBtn) {
        DOM.cancelListeningBtn.addEventListener('click', () => {
            cancelSpeechRecognition();
        });
    }

    // Artist view Actions
    if (DOM.artistBackBtn) {
        DOM.artistBackBtn.addEventListener('click', () => {
            history.back();
        });
    }

    // Search
    DOM.searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    DOM.searchInput.addEventListener('focus', () => {
        if (DOM.searchInput.value.trim()) switchView('search');
    });
    DOM.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            DOM.searchInput.blur();
            handleSearch(DOM.searchInput.value);
        }
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            DOM.searchInput.focus();
        }
        if (e.key === ' ' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlay();
        }
    });

    // Quick chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            DOM.searchInput.value = chip.dataset.query;
            handleSearch(chip.dataset.query);
        });
    });

    // Player controls
    DOM.playBtn.addEventListener('click', togglePlay);
    DOM.nextBtn.addEventListener('click', playNext);
    DOM.prevBtn.addEventListener('click', playPrev);

    DOM.shuffleBtn.addEventListener('click', () => {
        state.isShuffle = !state.isShuffle;
        DOM.shuffleBtn.classList.toggle('active', state.isShuffle);
        showToast(state.isShuffle ? 'Shuffle on' : 'Shuffle off', 'info');
    });

    DOM.repeatBtn.addEventListener('click', () => {
        state.repeatMode = (state.repeatMode + 1) % 3;
        DOM.repeatBtn.classList.toggle('active', state.repeatMode > 0);
        const modes = ['Repeat off', 'Repeat all', 'Repeat one'];
        showToast(modes[state.repeatMode], 'info');
    });

    // Progress bar
    setupDragSeeking(DOM.progressContainer, DOM.progressBar, DOM.progressThumb);

    // Volume
    DOM.volumeSlider.addEventListener('input', (e) => {
        const vol = parseInt(e.target.value);
        state.volume = vol;
        localStorage.setItem('sonicwave_volume', vol);
        
        const isOnlineYt = state.currentSong && state.currentSong.audioUrl.startsWith('yt-');
        if (isOnlineYt) {
            if (ytPlayer && ytPlayerReady) ytPlayer.setVolume(vol);
        } else {
            audio.volume = vol / 100;
        }
        updateVolumeIcon();
    });

    DOM.volumeBtn.addEventListener('click', () => {
        let newVolume = 0;
        if (state.volume > 0) {
            state._prevVolume = state.volume;
            newVolume = 0;
        } else {
            newVolume = state._prevVolume || 80;
        }
        
        state.volume = newVolume;
        DOM.volumeSlider.value = newVolume;
        localStorage.setItem('sonicwave_volume', newVolume);
        
        const isOnlineYt = state.currentSong && state.currentSong.audioUrl.startsWith('yt-');
        if (isOnlineYt) {
            if (ytPlayer && ytPlayerReady) ytPlayer.setVolume(newVolume);
        } else {
            audio.volume = newVolume / 100;
        }
        updateVolumeIcon();
    });
    // Player favorite
    DOM.playerFavBtn.addEventListener('click', () => {
        if (state.currentSong) toggleFavorite(state.currentSong);
    });

    // Player download
    DOM.playerDownloadBtn.addEventListener('click', () => {
        if (state.currentSong) handleDownload(state.currentSong);
    });

    // Audio events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('play', () => {
        if (state.currentSong && state.currentSong.audioUrl.startsWith('yt-')) {
            return;
        }
        state.isPlaying = true;
        updatePlayButton();
    });
    audio.addEventListener('pause', () => {
        if (state.currentSong && state.currentSong.audioUrl.startsWith('yt-')) {
            return;
        }
        state.isPlaying = false;
        updatePlayButton();
    });
    audio.addEventListener('error', (e) => {
        // Ignore audio player errors if we are playing a YouTube track
        if (state.currentSong && state.currentSong.audioUrl.startsWith('yt-')) {
            return;
        }
        console.error('Audio error:', e);
        showToast('Playback error. Trying next song...', 'error');
        setTimeout(playNext, 1500);
    });

    // Clear queue
    DOM.clearQueueBtn.addEventListener('click', clearQueue);

    // Clear history
    DOM.clearHistoryBtn.addEventListener('click', () => {
        state.history = [];
        localStorage.removeItem('sonicwave_history');
        renderHistory();
        loadPersonalizedRecommendations();
        showToast('History cleared', 'info');
    });

    // Mobile menu
    DOM.mobileMenuBtn.addEventListener('click', () => {
        DOM.sidebar.classList.toggle('open');
        DOM.sidebarOverlay.classList.toggle('active');
    });

    DOM.sidebarOverlay.addEventListener('click', () => {
        DOM.sidebar.classList.remove('open');
        DOM.sidebarOverlay.classList.remove('active');
    });

    // --- Overlay & Autoplay Listeners ---
    
    // Open/Close overlay
    DOM.playerSongInfo.addEventListener('click', openOverlay);
    DOM.overlayCloseBtn.addEventListener('click', closeOverlay);

    // Seek inside the overlay
    setupDragSeeking(DOM.overlayProgressContainer, DOM.overlayProgressBar, DOM.overlayProgressThumb);

    // Playback buttons in overlay
    DOM.overlayPlayBtn.addEventListener('click', togglePlay);
    DOM.overlayPrevBtn.addEventListener('click', playPrev);
    DOM.overlayNextBtn.addEventListener('click', playNext);
    
    DOM.overlayFavBtn.addEventListener('click', () => {
        if (state.currentSong) {
            toggleFavorite(state.currentSong);
            updatePlayerUI();
        }
    });

    DOM.overlayDownloadBtn?.addEventListener('click', () => {
        if (state.currentSong) {
            handleDownload(state.currentSong);
        }
    });

    DOM.overlayPlaylistBtn?.addEventListener('click', () => {
        if (state.currentSong) {
            openPlaylistPicker(state.currentSong);
        }
    });

    DOM.overlayShuffleBtn.addEventListener('click', () => {
        state.isShuffle = !state.isShuffle;
        DOM.shuffleBtn.classList.toggle('active', state.isShuffle);
        DOM.overlayShuffleBtn.classList.toggle('active', state.isShuffle);
        showToast(state.isShuffle ? 'Shuffle on' : 'Shuffle off', 'info');
    });

    DOM.overlayRepeatBtn.addEventListener('click', () => {
        state.repeatMode = (state.repeatMode + 1) % 3;
        DOM.repeatBtn.classList.toggle('active', state.repeatMode > 0);
        DOM.overlayRepeatBtn.classList.toggle('active', state.repeatMode > 0);
        const modes = ['Repeat off', 'Repeat all', 'Repeat one'];
        showToast(modes[state.repeatMode], 'info');
    });

    // Autoplay toggle checkbox
    DOM.autoplayToggle.addEventListener('change', (e) => {
        state.autoplay = e.target.checked;
        localStorage.setItem('sonicwave_autoplay', state.autoplay);
        showToast(state.autoplay ? 'Autoplay enabled' : 'Autoplay disabled', 'info');
    });

    // Mobile Portrait Lyrics Toggle
    DOM.overlayVinylWrapper.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            openLyrics(true);
        }
    });

    const closeLyricsBtn = document.getElementById('close-lyrics-btn');
    if (closeLyricsBtn) {
        closeLyricsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLyrics(true);
        });
    }

    // Native Media Notification Controller events
    window.addEventListener('zidPlayPause', () => {
        togglePlay();
    });
    window.addEventListener('zidNext', () => {
        playNext();
    });
    window.addEventListener('zidPrev', () => {
        playPrev();
    });

    // Volume controls in overlay
    DOM.overlayVolumeSlider.addEventListener('input', (e) => {
        const vol = parseInt(e.target.value);
        state.volume = vol;
        DOM.volumeSlider.value = vol;
        localStorage.setItem('sonicwave_volume', vol);
        
        const isOnlineYt = state.currentSong && state.currentSong.audioUrl.startsWith('yt-');
        if (isOnlineYt) {
            if (ytPlayer && ytPlayerReady) ytPlayer.setVolume(vol);
        } else {
            audio.volume = vol / 100;
        }
        updateVolumeIcon();
    });

    DOM.overlayVolumeBtn.addEventListener('click', () => {
        let newVolume = 0;
        if (state.volume > 0) {
            state._prevVolume = state.volume;
            newVolume = 0;
        } else {
            newVolume = state._prevVolume || 80;
        }
        
        state.volume = newVolume;
        DOM.volumeSlider.value = newVolume;
        DOM.overlayVolumeSlider.value = newVolume;
        localStorage.setItem('sonicwave_volume', newVolume);
        
        const isOnlineYt = state.currentSong && state.currentSong.audioUrl.startsWith('yt-');
        if (isOnlineYt) {
            if (ytPlayer && ytPlayerReady) ytPlayer.setVolume(newVolume);
        } else {
            audio.volume = newVolume / 100;
        }
        updateVolumeIcon();
    });

    // Tabs in player overlay (Lyrics / Queue)
    DOM.overlayTabLyrics.addEventListener('click', () => {
        DOM.overlayTabLyrics.classList.add('active');
        DOM.overlayTabQueue.classList.remove('active');
        DOM.overlayPanelLyrics.classList.remove('hidden');
        DOM.overlayPanelQueue.classList.add('hidden');
    });

    DOM.overlayTabQueue.addEventListener('click', () => {
        DOM.overlayTabLyrics.classList.remove('active');
        DOM.overlayTabQueue.classList.add('active');
        DOM.overlayPanelLyrics.classList.add('hidden');
        DOM.overlayPanelQueue.classList.remove('hidden');
        renderOverlayQueue();
    });

    // Sleep Timer open dropdown
    DOM.overlaySleepBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = DOM.sleepDropdown.style.display === 'none';
        DOM.sleepDropdown.style.display = isHidden ? 'flex' : 'none';
    });

    // Close sleep timer dropdown if clicked outside
    document.addEventListener('click', () => {
        DOM.sleepDropdown.style.display = 'none';
    });

    // Sleep options
    document.querySelectorAll('.sleep-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const minutes = parseInt(opt.dataset.time);
            if (minutes > 0) {
                startSleepTimer(minutes);
            } else {
                clearSleepTimer();
            }
            DOM.sleepDropdown.style.display = 'none';
        });
    });

    // Playlist picker modal close
    DOM.closePlaylistPickerBtn?.addEventListener('click', closePlaylistPicker);
    
    // Create new playlist and add track submit click
    DOM.createPlaylistSubmitBtn?.addEventListener('click', () => {
        const name = DOM.newPlaylistInput.value.trim();
        if (!name) {
            showToast('Please enter a playlist name', 'warning');
            return;
        }
        if (createPlaylist(name)) {
            const songDataStr = DOM.playlistPickerModal.dataset.songData;
            if (songDataStr) {
                const song = JSON.parse(songDataStr);
                addSongToPlaylist(name, song);
            }
            closePlaylistPicker();
        }
    });

    // Create playlist button on Playlists view
    DOM.createPlaylistBtn?.addEventListener('click', () => {
        const name = prompt('Enter a name for your new playlist:');
        if (name === null) return;
        const cleanName = name.trim();
        if (!cleanName) {
            showToast('Playlist name cannot be empty', 'warning');
            return;
        }
        createPlaylist(cleanName);
        renderPlaylists();
    });

    // Play all playlist tracks
    DOM.playlistPlayBtn?.addEventListener('click', () => {
        const name = DOM.playlistDetailsTitle.textContent;
        playPlaylist(name);
    });

    // Delete active playlist
    DOM.playlistDeleteBtn?.addEventListener('click', () => {
        const name = DOM.playlistDetailsTitle.textContent;
        if (confirm(`Are you sure you want to delete the playlist "${name}"?`)) {
            deletePlaylist(name);
            switchView('playlists');
        }
    });

    // Back button in playlist details
    DOM.playlistBackBtn?.addEventListener('click', () => {
        if (history.state && history.state.playlist) {
            history.back();
        } else {
            DOM.playlistDetails.classList.add('hidden');
            DOM.playlistsGrid.classList.remove('hidden');
            if (DOM.createPlaylistBtn) DOM.createPlaylistBtn.style.display = 'block';
        }
    });

    // Pause heavy visual animations when app is blurred/hidden to save CPU
    window.addEventListener('blur', () => {
        DOM.overlayVinylWrapper.style.animationPlayState = 'paused';
    });
    window.addEventListener('focus', () => {
        if (state.isPlaying) {
            DOM.overlayVinylWrapper.style.animationPlayState = 'running';
        }
    });
}

function handleSongEnd() {
    const isOnlineYt = state.currentSong && state.currentSong.audioUrl.startsWith('yt-');
    
    if (state.repeatMode === 2) {
        // Repeat one
        if (isOnlineYt) {
            if (ytPlayer && ytPlayerReady) {
                ytPlayer.seekTo(0, true);
                ytPlayer.playVideo();
            }
        } else {
            audio.currentTime = 0;
            audio.play();
        }
    } else if (state.repeatMode === 1) {
        // Repeat all
        playNext();
    } else {
        // No repeat - play next if available
        if (state.queueIndex < state.queue.length - 1) {
            playNext();
        } else if (state.autoplay) {
            // Autoplay next related songs!
            handleAutoplay();
        } else {
            state.isPlaying = false;
            updatePlayButton();
            if (isOnlineYt && ytPlayer && ytPlayerReady) {
                ytPlayer.stopVideo();
            }
        }
    }
}

function updateVolumeIcon() {
    const isMuted = state.volume === 0;
    DOM.volumeIcon.style.display = isMuted ? 'none' : 'block';
    DOM.volumeMuteIcon.style.display = isMuted ? 'block' : 'none';

    // Sync overlay volume icons
    DOM.overlayVolumeIcon.style.display = isMuted ? 'none' : 'block';
    DOM.overlayVolumeMuteIcon.style.display = isMuted ? 'block' : 'none';
}

// ========== Toast Notifications ==========
function showToast(message, type = 'info') {
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== Utility Functions ==========
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========== Expanded Player Overlay View ==========
function openOverlay(shouldPushState = true) {
    if (!state.currentSong) return;
    state.isOverlayOpen = true;
    DOM.playerOverlay.classList.add('active');
    DOM.overlayVolumeSlider.value = state.volume;

    if (shouldPushState) {
        const currentView = document.querySelector('.view.active')?.id?.replace('view-', '') || 'home';
        const currentPlaylist = !DOM.playlistDetails.classList.contains('hidden') ? DOM.playlistDetailsTitle.textContent : null;
        history.pushState({ view: currentView, playlist: currentPlaylist, overlay: true, lyrics: false }, '');
    }
}

function closeOverlay(shouldPushState = true) {
    state.isOverlayOpen = false;
    DOM.playerOverlay.classList.remove('active');

    if (shouldPushState) {
        if (history.state && history.state.overlay) {
            history.back();
        }
    }
}

function openLyrics(shouldPushState = true) {
    DOM.playerOverlay.classList.add('show-lyrics');
    if (shouldPushState) {
        const currentView = document.querySelector('.view.active')?.id?.replace('view-', '') || 'home';
        const currentPlaylist = !DOM.playlistDetails.classList.contains('hidden') ? DOM.playlistDetailsTitle.textContent : null;
        history.pushState({
            view: currentView,
            playlist: currentPlaylist,
            overlay: true,
            lyrics: true
        }, '');
    }
}

// Ensure the helper compiles perfectly
function closeLyrics(shouldPushState = true) {
    DOM.playerOverlay.classList.remove('show-lyrics');
    if (shouldPushState) {
        if (history.state && history.state.lyrics) {
            history.back();
        }
    }
}

// ========== Synced Lyrics Fetcher & Scroller ==========
async function loadLyrics(songData) {
    DOM.lyricsContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    state.lyrics = [];
    
    const cleanTitle = songData.name
        .replace(/\(feat\.[^)]+\)/gi, '')
        .replace(/\(official[^)]+\)/gi, '')
        .replace(/\[official[^\]]+\]/gi, '')
        .replace(/music video/gi, '')
        .replace(/official video/gi, '')
        .replace(/video/gi, '')
        .trim();
        
    const cleanArtist = songData.artist
        .replace(/featuring[^,]+/gi, '')
        .split(',')[0]
        .trim();

    const searchUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    
    try {
        const res = await fetch(searchUrl);
        if (!res.ok) throw new Error('Lyrics search returned status ' + res.status);
        const data = await res.json();
        
        if (data && (data.syncedLyrics || data.plainLyrics)) {
            if (data.syncedLyrics) {
                state.lyrics = parseLrc(data.syncedLyrics);
                renderSyncedLyrics(state.lyrics);
            } else {
                renderPlainLyrics(data.plainLyrics);
            }
        } else {
            showNoLyricsState();
        }
    } catch (err) {
        console.warn('LrcLib lyrics fetch failed:', err);
        try {
            const queryUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanArtist + ' ' + cleanTitle)}`;
            const res = await fetch(queryUrl);
            if (res.ok) {
                const results = await res.json();
                if (results && results.length > 0) {
                    const bestMatch = results[0];
                    if (bestMatch.syncedLyrics) {
                        state.lyrics = parseLrc(bestMatch.syncedLyrics);
                        renderSyncedLyrics(state.lyrics);
                        return;
                    } else if (bestMatch.plainLyrics) {
                        renderPlainLyrics(bestMatch.plainLyrics);
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn('LrcLib search fallback also failed:', e);
        }
        showNoLyricsState();
    }
}

function parseLrc(lrcText) {
    const lines = lrcText.split('\n');
    const lyrics = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3]);
            const time = minutes * 60 + seconds + (milliseconds / 100);
            const text = line.replace(timeRegex, '').trim();
            lyrics.push({ time, text });
        }
    }
    return lyrics.sort((a, b) => a.time - b.time);
}

function renderSyncedLyrics(lyricsArray) {
    DOM.lyricsContainer.innerHTML = '';
    if (lyricsArray.length === 0) {
        showNoLyricsState();
        return;
    }
    
    lyricsArray.forEach((line, idx) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'lyric-line';
        lineEl.textContent = line.text || '🎵';
        lineEl.dataset.index = idx;
        
        lineEl.addEventListener('click', () => {
            const isOnlineYt = state.currentSong && state.currentSong.audioUrl.startsWith('yt-');
            if (isOnlineYt) {
                if (ytPlayer && ytPlayerReady) ytPlayer.seekTo(line.time, true);
            } else {
                audio.currentTime = line.time;
            }
            syncLyrics(line.time);
        });
        
        DOM.lyricsContainer.appendChild(lineEl);
    });
}

function renderPlainLyrics(plainText) {
    DOM.lyricsContainer.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'lyrics-plain-wrapper';
    wrapper.style.textAlign = 'left';
    wrapper.style.fontSize = '1.25rem';
    wrapper.style.lineHeight = '1.8';
    wrapper.style.color = 'var(--text-secondary)';
    wrapper.style.whiteSpace = 'pre-wrap';
    
    wrapper.textContent = plainText;
    DOM.lyricsContainer.appendChild(wrapper);
}

function showNoLyricsState() {
    DOM.lyricsContainer.innerHTML = `
        <div class="lyrics-empty">
            <p>Lyrics not found for this track.</p>
            <p style="font-size: 0.9rem; margin-top: 10px; opacity: 0.6;">Enjoy the instrumental vibes!</p>
        </div>`;
}

function syncLyrics(time) {
    if (!state.lyrics || state.lyrics.length === 0) return;
    
    let activeIndex = -1;
    for (let i = 0; i < state.lyrics.length; i++) {
        if (time >= state.lyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }
    
    if (activeIndex !== -1) {
        const lines = DOM.lyricsContainer.querySelectorAll('.lyric-line');
        if (lines.length > activeIndex) {
            const alreadyActive = lines[activeIndex].classList.contains('active');
            if (!alreadyActive) {
                lines.forEach((line, idx) => {
                    line.classList.toggle('active', idx === activeIndex);
                });
                
                const activeLine = lines[activeIndex];
                const container = DOM.lyricsScrollWrapper;
                const containerHeight = container.clientHeight;
                const lineOffsetTop = activeLine.offsetTop;
                const lineHeight = activeLine.clientHeight;
                
                container.scrollTop = lineOffsetTop - (containerHeight / 2) + (lineHeight / 2);
            }
        }
    }
}

// ========== Autoplay Similar Songs ==========
async function handleAutoplay() {
    const current = state.currentSong;
    if (!current) return;
    
    showToast('Queue ended. Loading similar recommendations...', 'info');
    
    let saavnId = '';
    if (current.id.toString().startsWith('yt-')) {
        try {
            const results = await searchSongs(current.name, 1);
            if (results && results.length > 0) {
                saavnId = results[0].id;
            }
        } catch (e) {
            console.warn('Could not translate YT song to Saavn ID:', e);
        }
    } else {
        saavnId = current.id;
    }
    
    if (saavnId) {
        try {
            const res = await fetch(`${API_BASE}/songs/${saavnId}/suggestions`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data && json.data.length > 0) {
                    const suggestions = json.data.slice(0, 5).map(s => extractSongData(s));
                    suggestions.forEach(song => {
                        state.queue.push(song);
                    });
                    
                    showToast(`Autoplay added ${suggestions.length} related songs to your queue!`, 'success');
                    renderQueue();
                    
                    state.queueIndex++;
                    playSong(state.queue[state.queueIndex]);
                    return;
                }
            }
        } catch (err) {
            console.error('Autoplay recommendations fetch failed:', err);
        }
    }
    
    try {
        const query = current.artist.split(',')[0].trim();
        const fallbackResults = await searchSongs(query, 5);
        if (fallbackResults && fallbackResults.length > 0) {
            const recommendations = fallbackResults.map(s => extractSongData(s));
            recommendations.forEach(song => {
                state.queue.push(song);
            });
            showToast(`Autoplay added ${recommendations.length} artist picks to queue.`, 'success');
            renderQueue();
            state.queueIndex++;
            playSong(state.queue[state.queueIndex]);
            return;
        }
    } catch (e) {
        console.error('Autoplay search fallback failed:', e);
    }
    
    showToast('No autoplay recommendations found. Stopping.', 'info');
    state.isPlaying = false;
    updatePlayButton();
}

// ========== Personalized Recommendations ==========
async function loadPersonalizedRecommendations() {
    const favs = state.favorites || [];
    const history = state.history || [];
    
    if (favs.length === 0 && history.length === 0) {
        DOM.recommendedSection.style.display = 'none';
        return;
    }
    
    // Combine all history and favorites to find artists
    const allTracks = [...favs, ...history];
    const artists = allTracks.map(s => {
        if (!s.artist) return '';
        // Split and take primary artist
        return s.artist.split(',')[0].trim();
    }).filter(Boolean);
    
    if (artists.length === 0) {
        DOM.recommendedSection.style.display = 'none';
        return;
    }
    
    // Compute frequency counts of artists to find top preferences
    const artistCounts = {};
    artists.forEach(a => {
        artistCounts[a] = (artistCounts[a] || 0) + 1;
    });
    
    // Convert to sorted array of [artist, count]
    const sortedArtists = Object.keys(artistCounts).sort((a, b) => artistCounts[b] - artistCounts[a]);
    
    // Pick one artist from the top 3 most popular, or from whatever is available
    const poolSize = Math.min(3, sortedArtists.length);
    const chosenArtist = sortedArtists[Math.floor(Math.random() * poolSize)];
    
    try {
        const songs = await searchSongs(chosenArtist, 12);
        // Exclude songs already in favorites or recently played
        const filtered = songs
            .map(s => extractSongData(s))
            .filter(song => !favs.some(f => f.id === song.id) && !history.some(h => h.id === song.id))
            .slice(0, 6);
            
        if (filtered.length > 0) {
            DOM.personalizedGrid.innerHTML = '';
            filtered.forEach(song => {
                const card = createSongCard(song);
                DOM.personalizedGrid.appendChild(card);
            });
            
            DOM.recommendedSection.style.display = 'block';
            const titleEl = DOM.recommendedSection.querySelector('.section-title');
            if (titleEl) {
                titleEl.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    Recommended: More of ${chosenArtist}
                `;
            }
        } else {
            DOM.recommendedSection.style.display = 'none';
        }
    } catch (e) {
        console.warn('Personalized recommendations load failed:', e);
        DOM.recommendedSection.style.display = 'none';
    }
}

// ========== Seamless Preloading ==========
function checkPreload(currentTime, duration) {
    if (!duration || (!state.autoplay && state.queueIndex >= state.queue.length - 1)) return;
    
    // Trigger preload 20 seconds before end
    if (duration - currentTime <= 20) {
        let nextSong = null;
        if (state.queueIndex < state.queue.length - 1) {
            nextSong = state.queue[state.queueIndex + 1];
        }
        
        if (nextSong && nextSong.id !== state.nextPreloadedId) {
            state.nextPreloadedId = nextSong.id;
            
            // YouTube has its own buffer. Preload JioSaavn / Offline direct M4A streams
            const isYt = nextSong.audioUrl.startsWith('yt-');
            if (!isYt) {
                console.log('Seamless Preloading next track:', nextSong.name, nextSong.audioUrl);
                DOM.audioPreloader.src = nextSong.audioUrl;
                DOM.audioPreloader.load();
            }
        }
    }
}

// ========== Dynamic HSL Hashed Backdrops ==========
function applyDynamicBackground(song) {
    const color1 = stringToColor(song.name, 50, 12);
    const color2 = stringToColor(song.artist || '', 40, 8);
    
    DOM.playerOverlay.style.backgroundImage = `radial-gradient(circle at 50% 30%, ${color1} 0%, ${color2} 100%)`;
}

function stringToColor(str, s = 50, l = 15) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// ========== Sleep Timer System ==========
function startSleepTimer(minutes) {
    clearSleepTimer();
    
    state.sleepTimeRemaining = minutes;
    DOM.sleepTimerBadge.style.display = 'block';
    DOM.sleepTimerBadge.textContent = `${minutes}m`;
    showToast(`Sleep timer set for ${minutes} minutes.`, 'success');
    
    // Decrement countdown every minute
    state.sleepTimerId = setInterval(() => {
        state.sleepTimeRemaining--;
        if (state.sleepTimeRemaining <= 0) {
            clearSleepTimer();
            state.isPlaying = false;
            audio.pause();
            if (ytPlayer && ytPlayerReady && state.currentSong && state.currentSong.audioUrl.startsWith('yt-')) {
                ytPlayer.pauseVideo();
            }
            updatePlayButton();
            showToast('Sleep timer finished. Playback stopped.', 'info');
        } else {
            DOM.sleepTimerBadge.textContent = `${state.sleepTimeRemaining}m`;
        }
    }, 60000);
}

function clearSleepTimer() {
    if (state.sleepTimerId) {
        clearInterval(state.sleepTimerId);
        state.sleepTimerId = null;
    }
    state.sleepTimeRemaining = 0;
    DOM.sleepTimerBadge.style.display = 'none';
    showToast('Sleep timer canceled.', 'info');
}

// ========== Overlay Queue Manager ==========
function renderOverlayQueue() {
    DOM.overlayQueueContainer.innerHTML = '';
    
    if (state.queue.length === 0) {
        DOM.overlayQueueContainer.innerHTML = '<div class="lyrics-empty"><p>Queue is empty</p></div>';
        return;
    }
    
    state.queue.forEach((song, index) => {
        const isActive = index === state.queueIndex;
        const row = document.createElement('div');
        row.className = `overlay-queue-row${isActive ? ' active' : ''}`;
        
        row.innerHTML = `
            <img src="${song.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"%3E%3Crect fill="%231a1a28" width="48" height="48"/%3E%3Ctext x="24" y="30" fill="%234a4a5e" font-size="18" text-anchor="middle"%3E♪%3C/text%3E%3C/svg%3E'}" alt="${song.name}" class="overlay-queue-art">
            <div class="overlay-queue-meta">
                <div class="overlay-queue-title" title="${song.name}">${song.name}</div>
                <div class="overlay-queue-artist" title="${song.artist}">${song.artist}</div>
            </div>
            <div class="overlay-queue-actions">
                <button class="btn-reorder btn-move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button class="btn-reorder btn-move-down" title="Move Down" ${index === state.queue.length - 1 ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <button class="btn-remove-queue" title="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `;
        
        row.addEventListener('click', (e) => {
            if (e.target.closest('.btn-reorder') || e.target.closest('.btn-remove-queue')) return;
            state.queueIndex = index;
            playSong(song);
        });
        
        row.querySelector('.btn-move-up').addEventListener('click', (e) => {
            e.stopPropagation();
            moveQueueItem(index, -1);
        });
        
        row.querySelector('.btn-move-down').addEventListener('click', (e) => {
            e.stopPropagation();
            moveQueueItem(index, 1);
        });
        
        row.querySelector('.btn-remove-queue').addEventListener('click', (e) => {
            e.stopPropagation();
            removeQueueItem(index);
        });
        
        DOM.overlayQueueContainer.appendChild(row);
    });
}

function moveQueueItem(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= state.queue.length) return;
    
    const temp = state.queue[index];
    state.queue[index] = state.queue[targetIndex];
    state.queue[targetIndex] = temp;
    
    if (state.queueIndex === index) {
        state.queueIndex = targetIndex;
    } else if (state.queueIndex === targetIndex) {
        state.queueIndex = index;
    }
    
    renderQueue();
    renderOverlayQueue();
}

function removeQueueItem(index) {
    if (index === state.queueIndex) {
        showToast("Cannot remove the currently playing song from queue.", "warning");
        return;
    }
    
    state.queue.splice(index, 1);
    
    if (index < state.queueIndex) {
        state.queueIndex--;
    }
    
    renderQueue();
    renderOverlayQueue();
    showToast("Song removed from queue.", "success");
}

// ========== Playlist Management ==========
function createPlaylist(name) {
    const cleanName = name.trim();
    if (!cleanName) return false;
    if (state.playlists[cleanName]) {
        showToast(`Playlist "${cleanName}" already exists!`, 'error');
        return false;
    }
    state.playlists[cleanName] = [];
    localStorage.setItem('sonicwave_playlists', JSON.stringify(state.playlists));
    showToast(`Playlist "${cleanName}" created!`, 'success');
    return true;
}

function deletePlaylist(name) {
    if (!state.playlists[name]) return;
    delete state.playlists[name];
    localStorage.setItem('sonicwave_playlists', JSON.stringify(state.playlists));
    showToast(`Playlist "${name}" deleted.`, 'info');
}

function addSongToPlaylist(playlistName, song) {
    if (!state.playlists[playlistName]) {
        state.playlists[playlistName] = [];
    }
    // Prevent duplicate songs in a playlist
    if (state.playlists[playlistName].some(s => s.id === song.id)) {
        showToast(`"${song.name}" is already in playlist "${playlistName}"`, 'info');
        return;
    }
    state.playlists[playlistName].push(song);
    localStorage.setItem('sonicwave_playlists', JSON.stringify(state.playlists));
    showToast(`Added to "${playlistName}"`, 'success');
    
    // Update recommendations since user profile changed
    loadPersonalizedRecommendations();
}

function removeSongFromPlaylist(playlistName, songId) {
    if (!state.playlists[playlistName]) return;
    state.playlists[playlistName] = state.playlists[playlistName].filter(s => s.id !== songId);
    localStorage.setItem('sonicwave_playlists', JSON.stringify(state.playlists));
    showToast("Removed from playlist", "info");
    
    // Re-render list
    showPlaylistDetails(playlistName);
}

function playPlaylist(name) {
    const songs = state.playlists[name];
    if (!songs || songs.length === 0) {
        showToast(`Playlist "${name}" is empty! Add songs first.`, 'info');
        return;
    }
    state.queue = [...songs];
    state.queueIndex = 0;
    playSong(state.queue[0]);
    renderQueue();
    showToast(`Playing playlist "${name}"`, 'success');
}

function renderPlaylists() {
    if (!DOM.playlistsGrid) return;
    DOM.playlistDetails.classList.add('hidden');
    DOM.playlistsGrid.classList.remove('hidden');
    if (DOM.createPlaylistBtn) DOM.createPlaylistBtn.style.display = 'block';

    DOM.playlistsGrid.innerHTML = '';
    const keys = Object.keys(state.playlists);

    if (keys.length === 0) {
        DOM.playlistsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; padding: 40px 0;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; margin-bottom: 12px; color: var(--text-tertiary);"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <p>No playlists yet. Create one or add a song to get started!</p>
            </div>
        `;
        return;
    }

    keys.forEach(name => {
        const songs = state.playlists[name];
        const card = document.createElement('div');
        card.className = 'playlist-card';
        
        card.innerHTML = `
            <div style="width: 100%; aspect-ratio: 1; background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; position: relative; box-shadow: var(--shadow-sm);">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 40px; height: 40px;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; color: white;">
                    ${songs.length} ${songs.length === 1 ? 'song' : 'songs'}
                </div>
            </div>
            <div style="min-width: 0;">
                <div style="font-family: var(--font-display); font-weight: 700; font-size: 1rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">Your Playlist</div>
            </div>
        `;

        card.addEventListener('click', () => showPlaylistDetails(name));
        DOM.playlistsGrid.appendChild(card);
    });
}

function showPlaylistDetails(name, shouldPushState = true) {
    if (!DOM.playlistDetails) return;
    DOM.playlistsGrid.classList.add('hidden');
    DOM.playlistDetails.classList.remove('hidden');
    if (DOM.createPlaylistBtn) DOM.createPlaylistBtn.style.display = 'none';

    DOM.playlistDetailsTitle.textContent = name;
    DOM.playlistSongsList.innerHTML = '';

    const songs = state.playlists[name] || [];
    if (songs.length === 0) {
        DOM.playlistSongsList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <p>This playlist is empty. Add songs from Search or Home!</p>
            </div>
        `;
    } else {
        songs.forEach((song, index) => {
            const row = createSongRow(song, index + 1, 'playlist-detail');
            DOM.playlistSongsList.appendChild(row);
        });
    }

    if (shouldPushState) {
        history.pushState({ view: 'playlists', playlist: name, overlay: false, lyrics: false }, '');
    }
}

// ========== Playlist Picker Modal ==========
function openPlaylistPicker(song) {
    if (!DOM.playlistPickerModal) return;
    
    // Save song data to modal dataset so we know what song to add
    DOM.playlistPickerModal.dataset.songData = JSON.stringify(song);
    DOM.newPlaylistInput.value = '';
    
    DOM.playlistPickerList.innerHTML = '';
    const keys = Object.keys(state.playlists);
    
    if (keys.length === 0) {
        DOM.playlistPickerList.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); font-size: 0.9rem; padding: 10px 0;">
                No existing playlists. Create one below!
            </div>
        `;
    } else {
        keys.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'picker-playlist-item';
            btn.textContent = name;
            btn.addEventListener('click', () => {
                addSongToPlaylist(name, song);
                closePlaylistPicker();
            });
            DOM.playlistPickerList.appendChild(btn);
        });
    }
    
    DOM.playlistPickerModal.classList.remove('hidden');
}

function closePlaylistPicker() {
    DOM.playlistPickerModal?.classList.add('hidden');
}

// ========== SPA Mobile Back Navigation Handlers ==========
function handlePopState(event) {
    // 1. If sidebar is open, close it
    if (DOM.sidebar && DOM.sidebar.classList.contains('open')) {
        DOM.sidebar.classList.remove('open');
        DOM.sidebarOverlay.classList.remove('active');
        // Restore history entry
        history.pushState(event.state, '');
        return;
    }

    // 2. If playlist picker modal is open, close it
    if (DOM.playlistPickerModal && !DOM.playlistPickerModal.classList.contains('hidden')) {
        closePlaylistPicker();
        // Restore history entry
        history.pushState(event.state, '');
        return;
    }

    const targetState = event.state;
    if (!targetState) {
        // Fallback to home
        switchView('home', false);
        closeOverlay(false);
        closeLyrics(false);
        DOM.playlistDetails.classList.add('hidden');
        DOM.playlistsGrid.classList.remove('hidden');
        if (DOM.createPlaylistBtn) DOM.createPlaylistBtn.style.display = 'block';
        return;
    }

    // Sync lyrics
    if (targetState.lyrics) {
        openLyrics(false);
    } else {
        closeLyrics(false);
    }

    // Sync overlay
    if (targetState.overlay) {
        if (!state.isOverlayOpen) {
            openOverlay(false);
        }
    } else {
        if (state.isOverlayOpen) {
            closeOverlay(false);
        }
    }

    // Sync playlist details
    if (targetState.playlist) {
        showPlaylistDetails(targetState.playlist, false);
    } else {
        DOM.playlistDetails.classList.add('hidden');
        DOM.playlistsGrid.classList.remove('hidden');
        if (DOM.createPlaylistBtn) DOM.createPlaylistBtn.style.display = 'block';
    }

    // Sync view / artist profile
    if (targetState.view) {
        if (targetState.view === 'artist' && targetState.artist) {
            showArtistView(targetState.artist, false);
        } else {
            switchView(targetState.view, false);
        }
    }
}

// ========== Voice Search, Song Identification & Radios ==========
let recognition = null;
let activeRecognitionMode = '';

function isBraveBrowser() {
    return navigator.brave && typeof navigator.brave.isBrave === 'function';
}

function voiceSearchFallback() {
    const query = prompt('🎤 Voice search unavailable.\n\nType your search query instead:');
    if (query && query.trim()) {
        DOM.searchInput.value = query.trim();
        handleSearch(query.trim());
        switchView('search');
        showToast(`Searching for "${query.trim()}"`, 'info');
    }
}

async function songIdentifyFallback() {
    const lyrics = prompt('🎵 Song identification unavailable.\n\nType some lyrics or the song name to identify it:');
    if (lyrics && lyrics.trim()) {
        showToast('Searching for matching songs...', 'info');
        const matchingSongs = await searchSongs(lyrics.trim(), 5);
        if (matchingSongs && matchingSongs.length > 0) {
            const bestMatch = extractSongData(matchingSongs[0]);
            showToast(`Found: ${bestMatch.name} by ${bestMatch.artist}`, 'success');
            
            DOM.searchInput.value = lyrics.trim();
            switchView('search');
            DOM.searchEmpty.classList.add('hidden');
            DOM.searchSectionsContainer.classList.remove('hidden');
            renderSaavnSearchResults(matchingSongs);
            
            playSong(bestMatch);
        } else {
            showToast('No matching song found. Try different lyrics.', 'error');
        }
    }
}

function startVoiceSearch() {
    // Use keyboard's built-in voice input (Gboard mic, SwiftKey, etc.)
    // This is the most reliable approach — works on ALL browsers and devices
    switchView('search');
    DOM.searchInput.value = '';
    DOM.searchInput.focus();
    
    // On mobile, the keyboard will appear with its own mic button
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        showToast('Tap the 🎤 mic button on your keyboard to speak', 'info');
    } else {
        // On desktop, try Web Speech API first, fall back to typing
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition && !isBraveBrowser()) {
            startWebSpeechSearch();
        } else {
            showToast('Type your search query — voice is only supported in Chrome', 'info');
        }
    }
}

function startWebSpeechSearch() {
    if (recognition) {
        try { recognition.abort(); } catch(e) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const overlayEl = DOM.listeningOverlay || $('listening-overlay');
    const titleEl = DOM.listeningTitle || $('listening-title');
    const subtitleEl = DOM.listeningSubtitle || $('listening-subtitle');

    if (!overlayEl || !titleEl || !subtitleEl) {
        showToast('Type your search in the search bar', 'info');
        return;
    }

    titleEl.textContent = 'Listening...';
    subtitleEl.textContent = 'Say the name of a song, artist, or album';
    overlayEl.classList.remove('hidden');

    activeRecognitionMode = 'search';

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const query = event.results[0][0].transcript;
        if (overlayEl) overlayEl.classList.add('hidden');
        if (query) {
            DOM.searchInput.value = query;
            handleSearch(query);
            showToast(`Searching for "${query}"`, 'info');
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (overlayEl) overlayEl.classList.add('hidden');
        
        if (event.error === 'not-allowed') {
            showToast('Mic permission denied. Use your keyboard mic instead.', 'warning');
        } else if (event.error === 'network') {
            showToast('Voice service unavailable. Use the 🎤 on your keyboard instead.', 'warning');
        } else if (event.error === 'no-speech') {
            showToast('No speech detected. Try again.', 'warning');
        } else if (event.error !== 'aborted') {
            showToast('Voice failed. Type your search instead.', 'warning');
        }
        DOM.searchInput.focus();
    };

    recognition.onend = () => {
        if (overlayEl) overlayEl.classList.add('hidden');
    };

    try {
        recognition.start();
    } catch(e) {
        console.error('Failed to start recognition:', e);
        if (overlayEl) overlayEl.classList.add('hidden');
        showToast('Voice not available. Use your keyboard mic button.', 'warning');
        DOM.searchInput.focus();
    }
}

function startSongIdentification() {
    // Use search bar for song identification — type lyrics or song name
    switchView('search');
    DOM.searchInput.value = '';
    DOM.searchInput.setAttribute('placeholder', 'Type lyrics or song name to identify...');
    DOM.searchInput.focus();
    
    showToast('Type some lyrics or the song name, then press Enter to find it!', 'info');
    
    // Restore original placeholder after the user leaves the input
    const restorePlaceholder = () => {
        DOM.searchInput.setAttribute('placeholder', 'Search for songs, artists, albums...');
        DOM.searchInput.removeEventListener('blur', restorePlaceholder);
    };
    DOM.searchInput.addEventListener('blur', restorePlaceholder);
}

function cancelSpeechRecognition() {
    activeRecognitionMode = '';
    if (recognition) {
        try { recognition.abort(); } catch(e) {}
        recognition = null;
    }
    const overlayEl = DOM.listeningOverlay || $('listening-overlay');
    if (overlayEl) {
        overlayEl.classList.add('hidden');
    }
    showToast('Cancelled listening.', 'info');
}

async function showArtistView(artistName, shouldPushState = true) {
    if (!artistName) return;

    switchView('artist', false);
    closeOverlay(false);
    closeLyrics(false);
    DOM.playlistDetails.classList.add('hidden');
    DOM.playlistsGrid.classList.remove('hidden');

    DOM.artistNameTitle.textContent = artistName;
    DOM.artistMetaInfo.textContent = 'Loading top tracks...';
    DOM.artistSongsList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    if (shouldPushState) {
        history.pushState({ view: 'artist', artist: artistName, playlist: null, overlay: false, lyrics: false }, '');
    }

    try {
        const rawSongs = await searchSongs(artistName, 30);
        const songs = rawSongs.map(s => extractSongData(s));

        if (songs.length === 0) {
            DOM.artistSongsList.innerHTML = `<div class="empty-state"><p>No songs found for this artist.</p></div>`;
            DOM.artistMetaInfo.textContent = '0 songs';
            return;
        }

        DOM.artistMetaInfo.textContent = `${songs.length} top tracks`;
        DOM.artistSongsList.innerHTML = '';
        
        songs.forEach((song, index) => {
            const row = createSongRow(song, index + 1, 'artist');
            DOM.artistSongsList.appendChild(row);
        });

        DOM.artistPlayAllBtn.onclick = () => {
            state.queue = [...songs];
            state.queueIndex = 0;
            playSong(songs[0]);
            renderQueue();
            showToast(`Playing ${artistName} top tracks`, 'success');
        };

    } catch (e) {
        console.error('Failed to load artist tracks:', e);
        DOM.artistSongsList.innerHTML = `<div class="empty-state"><p>Failed to load tracks. Please try again.</p></div>`;
    }
}

async function createTrackRadio(songData) {
    if (!songData || !songData.id) return;
    
    showToast(`Creating radio for "${songData.name}"...`, 'info');
    
    try {
        const res = await fetch(`${API_BASE}/songs/${songData.id}/suggestions`);
        const json = await res.json();
        
        if (json.success && json.data && json.data.length > 0) {
            const suggestions = json.data.map(s => extractSongData(s));
            
            // Queue format: target song first, followed by suggestions!
            state.queue = [songData, ...suggestions];
            state.queueIndex = 0;
            
            playSong(songData);
            renderQueue();
            showToast(`Song Radio started with ${suggestions.length} suggestions!`, 'success');
        } else {
            showToast('Could not find suggestions for this song.', 'error');
        }
    } catch (e) {
        console.error('Failed to create song radio:', e);
        showToast('Error creating song radio.', 'error');
    }
}

function renderArtistLinks(containerElement, artistString) {
    if (!containerElement) return;
    if (!artistString) {
        containerElement.innerHTML = '';
        return;
    }
    
    // Split on comma-separated artists
    const names = artistString.split(',').map(n => n.trim()).filter(Boolean);
    containerElement.innerHTML = '';
    
    names.forEach((name, idx) => {
        const span = document.createElement('span');
        span.className = 'clickable-artist-link';
        span.textContent = name;
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            showArtistView(name);
        });
        
        containerElement.appendChild(span);
        
        if (idx < names.length - 1) {
            containerElement.appendChild(document.createTextNode(', '));
        }
    });
}
