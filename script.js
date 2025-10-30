// TMDB API Configuration
const API_KEY = ''; // You'll need to add your API key here
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'original';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const genreFilter = document.getElementById('genreFilter');
const sortFilter = document.getElementById('sortFilter');
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

// Grid elements
const trendingGrid = document.getElementById('trendingGrid');
const topRatedGrid = document.getElementById('topRatedGrid');
const upcomingGrid = document.getElementById('upcomingGrid');
const searchResults = document.getElementById('searchResults');
const searchGrid = document.getElementById('searchGrid');
const favoritesGrid = document.getElementById('favoritesGrid');

// Modal elements
const movieModal = document.getElementById('movieModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalRating = document.getElementById('modalRating');
const modalYear = document.getElementById('modalYear');
const modalRuntime = document.getElementById('modalRuntime');
const modalGenres = document.getElementById('modalGenres');
const modalOverview = document.getElementById('modalOverview');
const castGrid = document.getElementById('castGrid');
const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
const trailerBtn = document.getElementById('trailerBtn');

// State
let favorites = JSON.parse(localStorage.getItem('movieFavorites')) || [];
let currentMovie = null;
let genres = {};

// Initialize
init();

async function init() {
    await loadGenres();
    loadMovies();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    genreFilter.addEventListener('change', handleFilterChange);
    sortFilter.addEventListener('change', handleFilterChange);
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            switchPage(page);
        });
    });
    
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && movieModal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Switch between pages
function switchPage(pageName) {
    navLinks.forEach(link => link.classList.remove('active'));
    pages.forEach(page => page.classList.remove('active'));
    
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    document.getElementById(`${pageName}Page`).classList.add('active');
    
    if (pageName === 'favorites') {
        displayFavorites();
    }
}

// Load genres
async function loadGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        const data = await response.json();
        
        // Store genres as object for quick lookup
        data.genres.forEach(genre => {
            genres[genre.id] = genre.name;
        });
        
        // Populate genre filter
        data.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            genreFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// Load initial movies
async function loadMovies() {
    await Promise.all([
        fetchAndDisplay(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`, trendingGrid),
        fetchAndDisplay(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`, topRatedGrid),
        fetchAndDisplay(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}`, upcomingGrid)
    ]);
}

// Fetch and display movies
async function fetchAndDisplay(url, container) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        displayMovies(data.results.slice(0, 8), container);
    } catch (error) {
        console.error('Error fetching movies:', error);
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1 / -1;">Failed to load movies. Please try again later.</p>';
    }
}

// Display movies in grid
function displayMovies(movies, container) {
    container.innerHTML = '';
    
    if (movies.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1 / -1;">No movies found.</p>';
        return;
    }
    
    movies.forEach(movie => {
        const card = createMovieCard(movie);
        container.appendChild(card);
    });
}

// Create movie card
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const posterPath = movie.poster_path 
        ? `${IMAGE_BASE_URL}/${POSTER_SIZE}${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Image';
    
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    const isFavorited = favorites.some(fav => fav.id === movie.id);
    
    card.innerHTML = `
        <img src="${posterPath}" alt="${movie.title}" class="movie-poster">
        <button class="favorite-btn-card ${isFavorited ? 'favorited' : ''}" data-id="${movie.id}">
            <svg class="heart-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        </button>
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-meta">
                <span class="rating">${rating}</span>
                <span>${year}</span>
            </div>
        </div>
    `;
    
    // Click on card opens modal
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.favorite-btn-card')) {
            openModal(movie.id);
        }
    });
    
    // Favorite button
    const favoriteBtn = card.querySelector('.favorite-btn-card');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(movie);
        favoriteBtn.classList.toggle('favorited');
    });
    
    return card;
}

// Handle search
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    searchResults.style.display = 'block';
    searchGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(4);
    
    try {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await response.json();
        displayMovies(data.results, searchGrid);
    } catch (error) {
        console.error('Error searching movies:', error);
        searchGrid.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1 / -1;">Search failed. Please try again.</p>';
    }
}

// Handle filter change
async function handleFilterChange() {
    const genre = genreFilter.value;
    const sort = sortFilter.value;
    
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=${sort}`;
    if (genre) {
        url += `&with_genres=${genre}`;
    }
    
    searchResults.style.display = 'block';
    searchGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(8);
    
    await fetchAndDisplay(url, searchGrid);
}

// Open movie modal
async function openModal(movieId) {
    try {
        movieModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Fetch movie details
        const [movieResponse, creditsResponse] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`)
        ]);
        
        const movie = await movieResponse.json();
        const credits = await creditsResponse.json();
        
        currentMovie = movie;
        
        // Populate modal
        const backdropPath = movie.backdrop_path 
            ? `${IMAGE_BASE_URL}/${BACKDROP_SIZE}${movie.backdrop_path}`
            : '';
        
        if (backdropPath) {
            modalBackdrop.style.backgroundImage = `linear-gradient(to bottom, transparent 0%, var(--bg-secondary) 100%), url(${backdropPath})`;
            modalBackdrop.style.backgroundSize = 'cover';
            modalBackdrop.style.backgroundPosition = 'center';
        }
        
        modalTitle.textContent = movie.title;
        modalRating.innerHTML = `⭐ ${movie.vote_average.toFixed(1)}`;
        modalYear.textContent = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
        modalRuntime.textContent = movie.runtime ? `${movie.runtime} min` : 'N/A';
        modalOverview.textContent = movie.overview || 'No overview available.';
        
        // Genres
        modalGenres.innerHTML = '';
        movie.genres.forEach(genre => {
            const tag = document.createElement('span');
            tag.className = 'genre-tag';
            tag.textContent = genre.name;
            modalGenres.appendChild(tag);
        });
        
        // Cast
        displayCast(credits.cast.slice(0, 6));
        
        // Favorite button state
        const isFavorited = favorites.some(fav => fav.id === movie.id);
        modalFavoriteBtn.classList.toggle('favorited', isFavorited);
        
        // Trailer button - fetch videos
        try {
            const videosResponse = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
            const videosData = await videosResponse.json();
            const trailer = videosData.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
            
            if (trailer) {
                trailerBtn.style.display = 'flex';
                trailerBtn.onclick = () => window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
            } else {
                trailerBtn.style.display = 'none';
            }
        } catch (error) {
            trailerBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading movie details:', error);
        closeModal();
    }
}

// Close modal
function closeModal() {
    movieModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentMovie = null;
}

// Display cast
function displayCast(cast) {
    castGrid.innerHTML = '';
    
    cast.forEach(member => {
        const div = document.createElement('div');
        div.className = 'cast-member';
        
        const photoPath = member.profile_path
            ? `${IMAGE_BASE_URL}/${POSTER_SIZE}${member.profile_path}`
            : 'https://via.placeholder.com/200x300?text=No+Photo';
        
        div.innerHTML = `
            <img src="${photoPath}" alt="${member.name}" class="cast-photo">
            <div class="cast-name">${member.name}</div>
            <div class="cast-character">${member.character}</div>
        `;
        
        castGrid.appendChild(div);
    });
}

// Toggle favorite
function toggleFavorite(movie) {
    const index = favorites.findIndex(fav => fav.id === movie.id);
    
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date
        });
    }
    
    localStorage.setItem('movieFavorites', JSON.stringify(favorites));
    
    // Update modal favorite button if modal is open
    if (currentMovie && currentMovie.id === movie.id) {
        modalFavoriteBtn.classList.toggle('favorited');
    }
}

// Modal favorite button
modalFavoriteBtn.addEventListener('click', () => {
    if (currentMovie) {
        toggleFavorite(currentMovie);
        
        // Update all favorite buttons for this movie
        document.querySelectorAll(`.favorite-btn-card[data-id="${currentMovie.id}"]`).forEach(btn => {
            btn.classList.toggle('favorited');
        });
    }
});

// Display favorites
function displayFavorites() {
    if (favorites.length === 0) {
        favoritesGrid.innerHTML = `
            <div class="empty-favorites">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <p>No favorites yet. Start adding movies you love!</p>
            </div>
        `;
    } else {
        displayMovies(favorites, favoritesGrid);
    }
}