const API_KEY = 'ccf7f5f875e70d4ea304695927460da5';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const STORAGE_KEYS = {
    FAVORITES: 'cinehub_favorites',
    WATCH_STATUS: 'cinehub_watch_status',
    USER_REGION: 'cinehub_user_region'
};

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const contentTypeFilter = document.getElementById('contentTypeFilter');
const genreFilter = document.getElementById('genreFilter');
const sortFilter = document.getElementById('sortFilter');
const navLinks = document.querySelectorAll('.nav-link');
const logoLink = document.getElementById('logoLink');

const heroCarousel = document.getElementById('heroCarousel');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');
const carouselIndicators = document.getElementById('carouselIndicators');
let carouselItems = [];
let currentSlide = 0;
let carouselInterval = null;
let isCarouselPaused = false;

const topRatedGrid = document.getElementById('topRatedGrid');
const upcomingGrid = document.getElementById('upcomingGrid');
const trendingRegionGrid = document.getElementById('trendingRegionGrid');
const recommendedGrid = document.getElementById('recommendedGrid');
const recommendedSection = document.getElementById('recommendedSection');
const searchResults = document.getElementById('searchResults');
const searchGrid = document.getElementById('searchGrid');
const myListGrid = document.getElementById('myListGrid');

const statusTabs = document.querySelectorAll('.status-tab');

const movieModal = document.getElementById('movieModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalRating = document.getElementById('modalRating');
const modalRuntime = document.getElementById('modalRuntime');
const modalCertification = document.getElementById('modalCertification');
const certificationSep = document.getElementById('certificationSep');
const modalGenres = document.getElementById('modalGenres');
const modalOverview = document.getElementById('modalOverview');
const castGrid = document.getElementById('castGrid');
const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
const trailerBtn = document.getElementById('trailerBtn');
const watchStatusRadios = document.querySelectorAll('input[name="watchStatus"]');

function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

let favorites = [];
let watchStatus = {};
let currentMovie = null;
let movieGenres = {};
let tvGenres = {};
let userRegion = 'US';
let currentListFilter = 'all';

init();

async function init() {
    await loadFromStorage();
    await getUserRegion();
    await loadGenres();
    await loadCarousel();
    loadMovies();
    setupEventListeners();
}

async function loadFromStorage() {
    try {
        const [favResult, statusResult] = await Promise.all([
            window.storage.get(STORAGE_KEYS.FAVORITES).catch(() => null),
            window.storage.get(STORAGE_KEYS.WATCH_STATUS).catch(() => null)
        ]);

        if (favResult?.value) favorites = JSON.parse(favResult.value);
        if (statusResult?.value) watchStatus = JSON.parse(statusResult.value);
    } catch (error) {
        console.error('Error loading from storage:', error);
    }
}

async function saveToStorage() {
    try {
        await Promise.all([
            window.storage.set(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites)),
            window.storage.set(STORAGE_KEYS.WATCH_STATUS, JSON.stringify(watchStatus))
        ]);
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

async function getUserRegion() {
    try {
        const regionResult = await window.storage.get(STORAGE_KEYS.USER_REGION).catch(() => null);
        if (regionResult?.value) {
            userRegion = regionResult.value;
        } else {
            userRegion = 'US';
            await window.storage.set(STORAGE_KEYS.USER_REGION, userRegion);
        }
    } catch (error) {
        console.error('Error getting region:', error);
        userRegion = 'US';
    }
}

function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim();
        if (!query) {
            searchResults.style.display = 'none';
            searchGrid.innerHTML = '';
            return;
        }
        handleSearch();
    }, 300));

    contentTypeFilter.addEventListener('change', () => {
        updateGenreFilter();
        handleFilterChange();
    });

    genreFilter.addEventListener('change', handleFilterChange);
    sortFilter.addEventListener('change', handleFilterChange);

    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetToHome();
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(e.target.dataset.page);
        });
    });

    statusTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            statusTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentListFilter = tab.dataset.status;
            displayMyList();
        });
    });

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    watchStatusRadios.forEach(radio => {
        radio.addEventListener('change', handleWatchStatusChange);
    });

    carouselPrev.addEventListener('click', () => {
        changeSlide(currentSlide - 1);
        resetCarouselInterval();
    });

    carouselNext.addEventListener('click', () => {
        changeSlide(currentSlide + 1);
        resetCarouselInterval();
    });

    heroCarousel.addEventListener('mouseenter', () => isCarouselPaused = true);
    heroCarousel.addEventListener('mouseleave', () => isCarouselPaused = false);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && movieModal.classList.contains('active')) {
            closeModal();
        }
    });

    modalFavoriteBtn.addEventListener('click', () => {
        if (currentMovie) {
            toggleFavorite(currentMovie);
            document.querySelectorAll(`.favorite-btn-card[data-id="${currentMovie.id}"]`).forEach(btn => {
                btn.classList.toggle('favorited');
            });
        }
    });

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const drawerClose = document.getElementById('drawerClose');
    const mobileSearchToggle = document.getElementById('mobileSearchToggle');
    const mobileSearch = document.getElementById('mobileSearch');
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const mobileSearchGo = document.getElementById('mobileSearchGo');

    if (mobileMenuBtn && mobileDrawer) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileDrawer.classList.add('active');
        });
        
        if (drawerClose) {
            drawerClose.addEventListener('click', () => {
                mobileDrawer.classList.remove('active');
            });
        }
        
        if (drawerOverlay) {
            drawerOverlay.addEventListener('click', () => {
                mobileDrawer.classList.remove('active');
            });
        }
    }

    if (mobileSearchToggle && mobileSearch) {
        mobileSearchToggle.addEventListener('click', () => {
            mobileSearch.style.display = mobileSearch.style.display === 'block' ? 'none' : 'block';
            if (mobileSearch.style.display === 'block' && mobileSearchInput) {
                mobileSearchInput.focus();
            }
        });
    }

    if (mobileSearchGo && mobileSearchInput) {
        mobileSearchGo.addEventListener('click', () => {
            const query = mobileSearchInput.value.trim();
            if (query) {
                searchInput.value = query;
                handleSearch();
                mobileSearch.style.display = 'none';
            }
        });
        
        mobileSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                mobileSearchGo.click();
            }
        });
    }

    document.querySelectorAll('[data-drawer]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const type = link.dataset.drawer;
            
            if (mobileDrawer) {
                mobileDrawer.classList.remove('active');
            }
            
            if (type === 'home') {
                resetToHome();
            } else if (type === 'mylist') {
                switchPage('mylist');
            } else if (type === 'movies') {
                resetToHome();
                contentTypeFilter.value = 'movie';
                updateGenreFilter();
                handleFilterChange();
            } else if (type === 'tv') {
                resetToHome();
                contentTypeFilter.value = 'tv';
                updateGenreFilter();
                handleFilterChange();
            } else if (type === 'popular') {
                resetToHome();
                sortFilter.value = 'popularity.desc';
                handleFilterChange();
            } else if (type === 'genres') {
                resetToHome();
                searchResults.style.display = 'block';
                searchGrid.innerHTML = '<h3 style="grid-column: 1/-1; margin-bottom: 1rem; color: var(--text-white);">Browse by Genre</h3>';
                
                const genreButtons = document.createElement('div');
                genreButtons.style.cssText = 'grid-column: 1/-1; display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem;';
                
                const allGenres = contentTypeFilter.value === 'tv' ? tvGenres : movieGenres;
                Object.entries(allGenres).forEach(([id, name]) => {
                    const btn = document.createElement('button');
                    btn.textContent = name;
                    btn.style.cssText = 'padding: 0.6rem 1.2rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; color: white; font-size: 0.9rem; cursor: pointer;';
                    btn.addEventListener('click', () => {
                        genreFilter.value = id;
                        handleFilterChange();
                    });
                    btn.addEventListener('mouseenter', () => {
                        btn.style.background = 'rgba(255, 255, 255, 0.15)';
                        btn.style.borderColor = 'white';
                    });
                    btn.addEventListener('mouseleave', () => {
                        btn.style.background = 'rgba(255, 255, 255, 0.1)';
                        btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    });
                    genreButtons.appendChild(btn);
                });
                
                searchGrid.appendChild(genreButtons);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

async function loadCarousel() {
    try {
        const response = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
        const data = await response.json();
        const movies = data.results.slice(0, 5);

        heroCarousel.innerHTML = '';
        carouselIndicators.innerHTML = '';
        carouselItems = [];

        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            const carouselItem = document.createElement('div');
            carouselItem.className = `carousel-item ${i === 0 ? 'active' : ''}`;

            const backdropPath = movie.backdrop_path
                ? `${IMAGE_BASE_URL}/original${movie.backdrop_path}`
                : `${IMAGE_BASE_URL}/original${movie.poster_path}`;

            const movieGenreNames = movie.genre_ids
                .slice(0, 3)
                .map(id => movieGenres[id] || '')
                .filter(name => name);

            carouselItem.innerHTML = `
                <img src="${backdropPath}" alt="${movie.title}" class="carousel-backdrop">
                <div class="carousel-overlay"></div>
                <div class="carousel-content">
                    <h2 class="carousel-title">${movie.title}</h2>
                    <div class="carousel-meta">
                        <span class="carousel-rating">${movie.vote_average.toFixed(1)}</span>
                    </div>
                    <div class="carousel-genres">
                        ${movieGenreNames.map(genre => `<span class="carousel-genre">${genre}</span>`).join('')}
                    </div>
                    <p class="carousel-overview">${movie.overview || 'No overview available.'}</p>
                    <div class="carousel-actions">
                        <button class="carousel-btn primary" data-id="${movie.id}">More Info</button>
                        <button class="carousel-btn secondary" data-id="${movie.id}">Add to List</button>
                    </div>
                </div>
            `;

            heroCarousel.appendChild(carouselItem);
            carouselItems.push(carouselItem);

            carouselItem.querySelector('.primary').addEventListener('click', () => openModal(movie.id, 'movie'));
            carouselItem.querySelector('.secondary').addEventListener('click', (e) => {
                e.stopPropagation();
                quickAddToList(movie);
            });

            const indicator = document.createElement('button');
            indicator.className = `carousel-indicator ${i === 0 ? 'active' : ''}`;
            indicator.addEventListener('click', () => {
                changeSlide(i);
                resetCarouselInterval();
            });
            carouselIndicators.appendChild(indicator);
        }

        startCarousel();
    } catch (error) {
        console.error('Error loading carousel:', error);
        heroCarousel.innerHTML = '<div class="carousel-loading"><p style="color: var(--text-white);">Failed to load carousel</p></div>';
    }
}

function changeSlide(index) {
    if (carouselItems.length === 0) return;

    if (index < 0) index = carouselItems.length - 1;
    if (index >= carouselItems.length) index = 0;

    carouselItems[currentSlide].classList.remove('active');
    if (carouselIndicators.children[currentSlide]) carouselIndicators.children[currentSlide].classList.remove('active');

    currentSlide = index;
    carouselItems[currentSlide].classList.add('active');
    if (carouselIndicators.children[currentSlide]) carouselIndicators.children[currentSlide].classList.add('active');
}

function startCarousel() {
    carouselInterval = setInterval(() => {
        if (!isCarouselPaused && !movieModal.classList.contains('active')) {
            changeSlide(currentSlide + 1);
        }
    }, 4000);
}

function resetCarouselInterval() {
    clearInterval(carouselInterval);
    startCarousel();
}

function quickAddToList(movie) {
    if (watchStatus[movie.id]) {
        delete watchStatus[movie.id];
        alert('Removed from your list!');
    } else {
        watchStatus[movie.id] = 'plan';
        alert('Added to your "Plan to Watch" list!');
    }
    saveToStorage();
}

function switchPage(pageName) {
    navLinks.forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

    const navLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
    if (navLink) navLink.classList.add('active');

    const currentPage = document.getElementById(`${pageName}Page`);
    if (currentPage) currentPage.classList.add('active');

    const hero = document.getElementById('hero');
    const homePage = document.getElementById('homePage');
    const mylistPage = document.getElementById('mylistPage');
    
    if (pageName === 'mylist') {
        if (hero) hero.style.display = 'none';
        if (homePage) homePage.style.display = 'none';
        if (mylistPage) mylistPage.style.display = 'block';
        displayMyList();
    } else {
        if (hero) hero.style.display = 'block';
        if (homePage) homePage.style.display = 'block';
        if (mylistPage) mylistPage.style.display = 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetToHome() {
    navLinks.forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const homeNav = document.querySelector('[data-page="home"]');
    if (homeNav) homeNav.classList.add('active');
    
    const homePage = document.getElementById('homePage');
    const hero = document.getElementById('hero');
    const mylistPage = document.getElementById('mylistPage');
    
    if (homePage) homePage.classList.add('active');
    if (hero) hero.style.display = 'block';
    if (homePage) homePage.style.display = 'block';
    if (mylistPage) mylistPage.style.display = 'none';

    contentTypeFilter.value = 'movie';
    genreFilter.value = '';
    sortFilter.value = 'popularity.desc';
    searchInput.value = '';
    searchResults.style.display = 'none';
    searchGrid.innerHTML = '';
    updateGenreFilter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadGenres() {
    try {
        const [movieResponse, tvResponse] = await Promise.all([
            fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}`)
        ]);

        const movieData = await movieResponse.json();
        const tvData = await tvResponse.json();

        movieData.genres.forEach(genre => movieGenres[genre.id] = genre.name);
        tvData.genres.forEach(genre => tvGenres[genre.id] = genre.name);

        updateGenreFilter();
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

function updateGenreFilter() {
    const contentType = contentTypeFilter.value;
    const currentValue = genreFilter.value;

    genreFilter.innerHTML = '<option value="">All Genres</option>';

    const genres = contentType === 'movie' ? movieGenres : 
                   contentType === 'tv' ? tvGenres : 
                   { ...movieGenres, ...tvGenres };

    Object.entries(genres).forEach(([id, name]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        genreFilter.appendChild(option);
    });

    if (currentValue && genreFilter.querySelector(`option[value="${currentValue}"]`)) {
        genreFilter.value = currentValue;
    }
}

async function loadMovies() {
    await Promise.all([
        fetchAndDisplay(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&region=${userRegion}`, trendingRegionGrid),
        fetchAndDisplay(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`, topRatedGrid),
        fetchAndDisplay(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}`, upcomingGrid)
    ]);

    loadRecommendations();
}

async function loadRecommendations() {
    const watchingItems = Object.entries(watchStatus)
        .filter(([id, status]) => status === 'watching')
        .map(([id]) => parseInt(id));

    const favoriteGenres = [...new Set(favorites.flatMap(movie => movie.genre_ids || []))];

    if (watchingItems.length === 0 && favoriteGenres.length === 0) {
        recommendedSection.style.display = 'none';
        return;
    }

    recommendedSection.style.display = 'block';
    recommendedGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(8);

    try {
        let allRecommended = [];

        if (watchingItems.length > 0) {
            for (const movieId of watchingItems.slice(0, 2)) {
                const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`);
                const movie = await response.json();
                allRecommended.push({ ...movie, priority: 1 });
            }
        }

        if (favoriteGenres.length > 0) {
            const genreId = favoriteGenres[0];
            const response = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`);
            const data = await response.json();
            const recommendations = data.results.slice(0, 6).map(movie => ({ ...movie, priority: 2 }));
            allRecommended = [...allRecommended, ...recommendations];
        }

        allRecommended.sort((a, b) => a.priority - b.priority);
        const uniqueRecommended = allRecommended.filter((movie, index, self) =>
            index === self.findIndex(m => m.id === movie.id)
        );

        displayMovies(uniqueRecommended.slice(0, 8), recommendedGrid);
    } catch (error) {
        console.error('Error loading recommendations:', error);
        recommendedSection.style.display = 'none';
    }
}

async function fetchAndDisplay(url, container) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        displayMovies(data.results.slice(0, 8), container);
    } catch (error) {
        console.error('Error fetching movies:', error);
        container.innerHTML = '<p style="color: var(--text-gray); text-align: center; grid-column: 1 / -1;">Failed to load content.</p>';
    }
}

function displayMovies(movies, container) {
    container.innerHTML = '';

    if (movies.length === 0) {
        container.innerHTML = '<p style="color: var(--text-gray); text-align: center; grid-column: 1 / -1;">No content found.</p>';
        return;
    }

    movies.filter(movie => movie.poster_path).forEach(movie => {
        const card = createMovieCard(movie);
        container.appendChild(card);
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const isTV = movie.media_type === 'tv' || movie.name;
    const title = isTV ? movie.name : movie.title;

    const posterPath = movie.poster_path
        ? `${IMAGE_BASE_URL}/w500${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Image';

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const isFavorited = favorites.some(fav => fav.id === movie.id);

    card.innerHTML = `
        <button class="favorite-btn-card ${isFavorited ? 'favorited' : ''}" data-id="${movie.id}">
            <svg class="heart-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        </button>
        <div class="movie-info">
            <h3 class="movie-title">${title}</h3>
            <div class="movie-meta">
                <span class="rating">${rating}</span>
            </div>
        </div>
    `;

    const img = document.createElement('img');
    img.src = posterPath;
    img.alt = title;
    img.className = 'movie-poster';
    img.onerror = () => img.src = 'https://via.placeholder.com/500x750?text=No+Image';
    card.prepend(img);

    card.addEventListener('click', (e) => {
        if (!e.target.closest('.favorite-btn-card')) {
            openModal(movie.id, isTV ? 'tv' : 'movie');
        }
    });

    const favoriteBtn = card.querySelector('.favorite-btn-card');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(movie);
        favoriteBtn.classList.toggle('favorited');
    });

    return card;
}

async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    searchResults.style.display = 'block';
    searchGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(4);

    try {
        const contentType = contentTypeFilter.value;

        const personResponse = await fetch(`${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const personData = await personResponse.json();

        if (personData.results.length > 0) {
            const person = personData.results[0];
            const creditsResponse = await fetch(`${BASE_URL}/person/${person.id}/movie_credits?api_key=${API_KEY}`);
            const creditsData = await creditsResponse.json();

            const movies = [...(creditsData.cast || []), ...(creditsData.crew || [])]
                .filter((movie, index, self) =>
                    index === self.findIndex(m => m.id === movie.id) && movie.poster_path
                )
                .sort((a, b) => b.popularity - a.popularity)
                .slice(0, 20)
                .map(movie => ({ ...movie, media_type: 'movie' }));

            if (movies.length > 0) {
                searchGrid.innerHTML = `<p style="grid-column: 1/-1; margin-bottom: 1rem; color: var(--text-white);">
                    Results for: <strong>${person.name}</strong> ${person.known_for_department ? `(${person.known_for_department})` : ''}
                </p>`;
                displayMovies(movies, searchGrid);
                return;
            }
        }

        if (contentType === 'both') {
            const [movieResponse, tvResponse] = await Promise.all([
                fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`),
                fetch(`${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`)
            ]);

            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();

            const movies = movieData.results.map(item => ({ ...item, media_type: 'movie' }));
            const tvShows = tvData.results.map(item => ({ ...item, media_type: 'tv' }));
            const combined = [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);

            displayMovies(combined, searchGrid);
        } else {
            const endpoint = contentType === 'movie' ? 'movie' : 'tv';
            const response = await fetch(`${BASE_URL}/search/${endpoint}?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
            const data = await response.json();
            const results = data.results.map(item => ({ ...item, media_type: contentType }));
            displayMovies(results, searchGrid);
        }
    } catch (error) {
        console.error('Error searching:', error);
        searchGrid.innerHTML = '<p style="color: var(--text-gray); text-align: center; grid-column: 1 / -1;">Search failed.</p>';
    }
}

async function handleFilterChange() {
    const genre = genreFilter.value;
    const sort = sortFilter.value;
    const contentType = contentTypeFilter.value;

    searchResults.style.display = 'block';
    searchGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(8);

    try {
        if (contentType === 'both') {
            let movieUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=${sort}`;
            let tvUrl = `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=${sort}`;

            if (genre) {
                movieUrl += `&with_genres=${genre}`;
                tvUrl += `&with_genres=${genre}`;
            }

            const [movieResponse, tvResponse] = await Promise.all([
                fetch(movieUrl),
                fetch(tvUrl)
            ]);

            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();

            const movies = movieData.results.slice(0, 10).map(item => ({ ...item, media_type: 'movie' }));
            const tvShows = tvData.results.slice(0, 10).map(item => ({ ...item, media_type: 'tv' }));
            const combined = [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);

            displayMovies(combined, searchGrid);
        } else {
            const endpoint = contentType === 'movie' ? 'movie' : 'tv';
            let url = `${BASE_URL}/discover/${endpoint}?api_key=${API_KEY}&sort_by=${sort}`;

            if (genre) url += `&with_genres=${genre}`;

            const response = await fetch(url);
            const data = await response.json();
            const results = data.results.map(item => ({ ...item, media_type: contentType }));
            displayMovies(results, searchGrid);
        }
    } catch (error) {
        console.error('Error filtering content:', error);
        searchGrid.innerHTML = '<p style="color: var(--text-gray); text-align: center; grid-column: 1 / -1;">Failed to load content.</p>';
    }
}

async function openModal(id, mediaType = 'movie') {
    try {
        movieModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        const endpoint = mediaType === 'tv' ? 'tv' : 'movie';

        const [detailsResponse, creditsResponse, releaseDatesResponse] = await Promise.all([
            fetch(`${BASE_URL}/${endpoint}/${id}?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/${endpoint}/${id}/credits?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/${endpoint}/${id}/release_dates?api_key=${API_KEY}`).catch(() => null)
        ]);

        const content = await detailsResponse.json();
        const credits = await creditsResponse.json();
        currentMovie = { ...content, media_type: mediaType };

        if (content.backdrop_path) {
            modalBackdrop.src = `${IMAGE_BASE_URL}/w1280${content.backdrop_path}`;
            modalBackdrop.alt = mediaType === 'tv' ? content.name : content.title;
        } else {
            modalBackdrop.src = '';
        }

        const title = mediaType === 'tv' ? content.name : content.title;
        modalTitle.textContent = title;
        modalRating.innerHTML = `⭐ ${content.vote_average.toFixed(1)}`;

        if (mediaType === 'tv') {
            modalRuntime.textContent = content.number_of_seasons ? `${content.number_of_seasons} Season${content.number_of_seasons > 1 ? 's' : ''}` : 'N/A';
        } else {
            modalRuntime.textContent = content.runtime ? `${content.runtime} min` : 'N/A';
        }

        if (releaseDatesResponse && mediaType === 'movie') {
            const releaseDatesData = await releaseDatesResponse.json();
            const usRelease = releaseDatesData.results.find(r => r.iso_3166_1 === 'US');
            if (usRelease?.release_dates[0]?.certification) {
                modalCertification.textContent = usRelease.release_dates[0].certification;
                modalCertification.style.display = 'inline-block';
                certificationSep.style.display = 'inline';
            } else {
                modalCertification.style.display = 'none';
                certificationSep.style.display = 'none';
            }
        } else {
            modalCertification.style.display = 'none';
            certificationSep.style.display = 'none';
        }

        modalOverview.textContent = content.overview || 'No overview available.';

        modalGenres.innerHTML = '';
        content.genres.forEach(genre => {
            const tag = document.createElement('span');
            tag.className = 'genre-tag';
            tag.textContent = genre.name;
            modalGenres.appendChild(tag);
        });

        displayCast(credits.cast.slice(0, 6));

        const isFavorited = favorites.some(fav => fav.id === content.id);
        modalFavoriteBtn.classList.toggle('favorited', isFavorited);

        const currentStatus = watchStatus[content.id];
        watchStatusRadios.forEach(radio => radio.checked = radio.value === currentStatus);

        try {
            const videosResponse = await fetch(`${BASE_URL}/${endpoint}/${id}/videos?api_key=${API_KEY}`);
            const videosData = await videosResponse.json();
            const trailer = videosData.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');

            if (trailer) {
                trailerBtn.style.display = 'flex';
                trailerBtn.onclick = () => window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
            } else {
                trailerBtn.style.display = 'none';
            }
        } catch {
            trailerBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading content details:', error);
        closeModal();
    }
}

function closeModal() {
    movieModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentMovie = null;
}

function displayCast(cast) {
    castGrid.innerHTML = '';

    if (cast.length === 0) {
        castGrid.innerHTML = '<p style="color: var(--text-gray); grid-column: 1 / -1;">No cast information available.</p>';
        return;
    }

    cast.forEach(member => {
        const div = document.createElement('div');
        div.className = 'cast-member';

        const photoPath = member.profile_path ? `${IMAGE_BASE_URL}/w185${member.profile_path}` : null;

        if (photoPath) {
            div.innerHTML = `
                <img src="${photoPath}" alt="${member.name}" class="cast-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="cast-photo-placeholder" style="display:none;">Photo Not Found</div>
                <div class="cast-name">${member.name}</div>
                <div class="cast-character">${member.character || member.job || ''}</div>
            `;
        } else {
            div.innerHTML = `
                <div class="cast-photo-placeholder">Photo Not Found</div>
                <div class="cast-name">${member.name}</div>
                <div class="cast-character">${member.character || member.job || ''}</div>
            `;
        }

        castGrid.appendChild(div);
    });
}

function toggleFavorite(movie) {
    const index = favorites.findIndex(fav => fav.id === movie.id);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({
            id: movie.id,
            title: movie.title || movie.name,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date || movie.first_air_date,
            genre_ids: movie.genre_ids || [],
            media_type: movie.media_type || 'movie'
        });
    }

    saveToStorage();

    if (currentMovie?.id === movie.id) {
        modalFavoriteBtn.classList.toggle('favorited');
    }

    loadRecommendations();
}

async function handleWatchStatusChange(e) {
    if (!currentMovie) return;

    const status = e.target.value;

    if (status === 'none') {
        delete watchStatus[currentMovie.id];
    } else {
        watchStatus[currentMovie.id] = status;
    }

    await saveToStorage();

    if (status === 'watching' || status === 'none') {
        loadRecommendations();
    }
}

function displayMyList() {
    const allItems = [
        ...favorites.map(fav => ({ ...fav, itemStatus: 'favorite' })),
        ...Object.entries(watchStatus).map(([id, status]) => ({
            id: parseInt(id),
            itemStatus: status
        }))
    ];

    const uniqueItems = allItems.reduce((acc, item) => {
        const existing = acc.find(i => i.id === item.id);
        if (!existing) {
            acc.push(item);
        } else {
            if (item.itemStatus === 'favorite') existing.isFavorite = true;
            if (item.itemStatus !== 'favorite') existing.watchStatus = item.itemStatus;
        }
        return acc;
    }, []);

    let filteredItems = uniqueItems;

    if (currentListFilter === 'favorite') {
        filteredItems = uniqueItems.filter(item => item.isFavorite || item.itemStatus === 'favorite');
    } else if (currentListFilter !== 'all') {
        filteredItems = uniqueItems.filter(item => item.itemStatus === currentListFilter || item.watchStatus === currentListFilter);
    }

    if (filteredItems.length === 0) {
        myListGrid.innerHTML = `
            <div class="empty-list">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No items in this category yet!</p>
            </div>
        `;
        return;
    }

    loadListItems(filteredItems);
}

async function loadListItems(items) {
    myListGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(Math.min(items.length, 8));

    const detailedItems = [];

    for (const item of items) {
        if (item.title || item.name) {
            detailedItems.push(item);
        } else {
            try {
                let response = await fetch(`${BASE_URL}/movie/${item.id}?api_key=${API_KEY}`);
                if (response.ok) {
                    const data = await response.json();
                    detailedItems.push({ ...data, itemStatus: item.itemStatus, media_type: 'movie' });
                } else {
                    response = await fetch(`${BASE_URL}/tv/${item.id}?api_key=${API_KEY}`);
                    if (response.ok) {
                        const data = await response.json();
                        detailedItems.push({ ...data, itemStatus: item.itemStatus, media_type: 'tv' });
                    }
                }
            } catch (error) {
                console.error(`Error loading item ${item.id}:`, error);
            }
        }
    }

    displayMovies(detailedItems, myListGrid);
}
