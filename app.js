const API_KEY = '0b0dcd78c76a9260b67f9396d4d426c8';
let currentId = null;
let currentType = 'movie';

// 1. Initialize
async function initApp() {
    console.log("Gathuo Engine Starting...");
    const yearSelect = document.getElementById('yearFilter');
    if (yearSelect) {
        for (let y = 2026; y >= 2005; y--) {
            yearSelect.innerHTML += `<option class="bg-zinc-900 text-white" value="${y}">${y}</option>`;
        }
    }
    fetchGenres();
    fetchTrendingHero();
    fetchLatestReleases();
    fetchBestTV();
}

// 2. Navigation Logic
function setMediaType(type) {
    currentType = type;
    document.getElementById('latestLabel').innerText = type === 'movie' ? 'Latest Releases' : 'Trending TV Series';
    fetchLatestReleases();
    fetchBestTV();
}

async function filterByGenre(genreId) {
    const res = await fetch(`https://api.themoviedb.org/3/discover/${currentType}?api_key=${API_KEY}&with_genres=${genreId}`);
    const data = await res.json();
    displayGrid(data.results, 'latestGrid', currentType);
}

async function filterByYear(year) {
    if(!year) return;
    const res = await fetch(`https://api.themoviedb.org/3/discover/${currentType}?api_key=${API_KEY}&primary_release_year=${year}`);
    const data = await res.json();
    displayGrid(data.results, 'latestGrid', currentType);
}

// 3. UI Updates
async function fetchTrendingHero() {
    const res = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${API_KEY}`);
    const data = await res.json();
    updateHeroSection(data.results[0]);
}

function updateHeroSection(item) {
    if(!item) return;
    const type = item.media_type || currentType;
    document.getElementById('hero').style.backgroundImage = `url('https://image.tmdb.org/t/p/original${item.backdrop_path}')`;
    document.getElementById('heroTitle').innerText = item.title || item.name;
    document.getElementById('heroDesc').innerText = item.overview;
    document.getElementById('heroRating').innerHTML = `<i class="fas fa-star mr-1 text-yellow-500"></i> ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}`;
    document.getElementById('heroYear').innerText = (item.release_date || item.first_air_date || '').split('-')[0];
    document.getElementById('heroBadge').innerText = "Top Selection";
    
    document.getElementById('heroPlay').onclick = () => openDetails(item.id, type);
    document.getElementById('heroMore').onclick = () => openDetails(item.id, type);
}

function displayGrid(items, elementId, type) {
    const grid = document.getElementById(elementId);
    if (!grid) return;
    grid.innerHTML = items.map(item => {
        const rating = (item.vote_average !== undefined && item.vote_average !== null) ? item.vote_average.toFixed(1) : '0.0';
        return `
            <div class="relative group cursor-pointer overflow-hidden rounded-lg bg-zinc-900" onclick="openDetails('${item.id}', '${type}')">
                <img src="${item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : 'https://via.placeholder.com/500x750?text=No+Poster'}" class="rounded-lg group-hover:scale-110 transition duration-500 shadow-lg aspect-[2/3] object-cover w-full">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <h3 class="font-bold text-[10px] truncate text-white">${item.title || item.name}</h3>
                </div>
                <div class="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-black text-yellow-500">
                    <i class="fas fa-star scale-75"></i> ${rating}
                </div>
            </div>
        `;
    }).join('');
}

// 4. Modal Engine
async function openDetails(id, type) {
    currentId = id;
    currentType = type;
    const data = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${API_KEY}&append_to_response=credits,videos`).then(r => r.json());
    
    document.getElementById('modalTitle').innerText = data.title || data.name;
    document.getElementById('modalOverview').innerText = data.overview;
    document.getElementById('modalYear').innerText = (data.release_date || data.first_air_date || '').split('-')[0];
    document.getElementById('modalRating').innerHTML = `<i class="fas fa-star mr-1 text-yellow-500"></i> ${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}`;
    document.getElementById('modalGenres').innerText = data.genres ? data.genres.map(g => g.name).join(', ') : 'Unknown';
    document.getElementById('modalHero').style.backgroundImage = `url('https://image.tmdb.org/t/p/original${data.backdrop_path}')`;
    document.getElementById('modalPoster').src = `https://image.tmdb.org/t/p/w500${data.poster_path}`;

    document.getElementById('modalActors').innerHTML = data.credits.cast.slice(0, 8).map(actor => `
        <div class="min-w-[90px] text-center">
            <img src="${actor.profile_path ? 'https://image.tmdb.org/t/p/w200' + actor.profile_path : 'https://via.placeholder.com/200x200?text=Cast'}" class="w-14 h-14 object-cover rounded-full mx-auto border border-zinc-700">
            <p class="text-[8px] mt-2 font-bold text-zinc-500 truncate px-1">${actor.name}</p>
        </div>
    `).join('');

    const trailer = data.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const trailerBtn = document.getElementById('trailerBtn');
    if (trailer) {
        trailerBtn.classList.remove('hidden');
        trailerBtn.onclick = () => openFinalPlayer(`https://www.youtube.com/embed/${trailer.key}?autoplay=1`);
    } else { trailerBtn.classList.add('hidden'); }

    const tvBox = document.getElementById('tvSelectors');
    if(type === 'tv') {
        tvBox.classList.remove('hidden');
        const sSelect = document.getElementById('seasonSelect');
        sSelect.innerHTML = data.seasons.map(s => `<option class="bg-zinc-900" value="${s.season_number}">Season ${s.season_number}</option>`).join('');
        loadEpisodes(data.seasons[0].season_number);
    } else { tvBox.classList.add('hidden'); }

    document.getElementById('finalWatchBtn').onclick = () => showGathuoNotice();
    document.getElementById('detailModal').classList.remove('hidden');
}

// 5. Advanced Features (Download & Notices)
function handleDownload() {
    const notice = document.createElement('div');
    notice.id = "downloadNotice";
    notice.className = "fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl";
    notice.innerHTML = `
        <div class="bg-zinc-900 border border-green-500/30 p-10 rounded-3xl max-w-md text-center shadow-2xl">
            <i class="fas fa-circle-arrow-down text-green-500 text-6xl mb-6"></i>
            <h2 class="text-2xl font-black mb-4 tracking-tighter uppercase text-white">Download Engine</h2>
            <p class="text-zinc-400 text-sm leading-relaxed mb-8">Ready to fetch link for: <br><span class="text-white font-bold">${document.getElementById('modalTitle').innerText}</span></p>
            <div class="flex flex-col gap-3">
                <button onclick="executeDownload()" class="bg-green-600 text-white w-full py-4 rounded-xl font-black uppercase tracking-widest hover:bg-green-700 transition">Get Download Link</button>
                <button onclick="document.getElementById('downloadNotice').remove()" class="text-zinc-500 text-xs font-bold uppercase hover:text-white">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(notice);
}

function executeDownload() {
    const s = document.getElementById('seasonSelect')?.value || 1;
    const e = document.getElementById('episodeSelect')?.value || 1;
    const downloadUrl = currentType === 'movie' 
        ? `https://vidsrc.me/download/movie?tmdb=${currentId}` 
        : `https://vidsrc.me/download/tv?tmdb=${currentId}&season=${s}&episode=${e}`;
    window.open(downloadUrl, '_blank');
    document.getElementById('downloadNotice')?.remove();
}

function showGathuoNotice() {
    const notice = document.createElement('div');
    notice.id = "gathuoNotice";
    notice.className = "fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md";
    notice.innerHTML = `
        <div class="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-md text-center shadow-2xl">
            <i class="fas fa-shield-heart text-red-600 text-5xl mb-6"></i>
            <h2 class="text-2xl font-black mb-4 tracking-tighter text-white">GATHUO VALUES YOU</h2>
            <p class="text-zinc-400 text-sm leading-relaxed mb-8">Ads may show. Just return to enjoy your movie. If it fails, change server to Streamtape.</p>
            <button onclick="document.getElementById('gathuoNotice').remove(); prepareToWatch();" class="bg-white text-black w-full py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition">Start Stream</button>
        </div>`;
    document.body.appendChild(notice);
}

// 6. Search & Helpers
document.getElementById('searchInput').addEventListener('keyup', async (e) => {
    const query = e.target.value;
    if (query.length > 2) {
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${query}`);
        const data = await res.json();
        const results = data.results.filter(i => i.poster_path);
        if(results.length > 0) updateHeroSection(results[0]); 
        displayGrid(results, 'latestGrid', 'movie');
    }
});

async function fetchGenres() {
    const res = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}`);
    const data = await res.json();
    document.getElementById('genreList').innerHTML = data.genres.map(g => `<button onclick="filterByGenre(${g.id})" class="text-left text-[10px] hover:text-red-500 transition uppercase font-bold tracking-tighter">${g.name}</button>`).join('');
}
async function fetchLatestReleases() {
    const endpoint = currentType === 'movie' ? 'now_playing' : 'popular';
    const res = await fetch(`https://api.themoviedb.org/3/${currentType}/${endpoint}?api_key=${API_KEY}`);
    const data = await res.json();
    displayGrid(data.results, 'latestGrid', currentType);
}
async function fetchBestTV() {
    const res = await fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}`);
    const data = await res.json();
    displayGrid(data.results, 'bestTVGrid', 'tv');
}
async function loadEpisodes(seasonNum) {
    const data = await fetch(`https://api.themoviedb.org/3/tv/${currentId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    document.getElementById('episodeSelect').innerHTML = data.episodes.map(e => `<option class="bg-zinc-900 text-white" value="${e.episode_number}">Ep ${e.episode_number}: ${e.name}</option>`).join('');
}
function prepareToWatch() {
    const s = document.getElementById('seasonSelect')?.value || 1;
    const e = document.getElementById('episodeSelect')?.value || 1;
    const embedUrl = currentType === 'movie' 
        ? `https://primesrc.me/embed/movie?tmdb=${currentId}&ds=streamtape&autoplay=1&muted=1` 
        : `https://primesrc.me/embed/tv?tmdb=${currentId}&season=${s}&episode=${e}&ds=streamtape&autoplay=1&muted=1`;
    openFinalPlayer(embedUrl);
}
function openFinalPlayer(url) {
    document.getElementById('iframeContainer').innerHTML = `<iframe src="${url}" width="100%" height="100%" frameborder="0" referrerpolicy="origin" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    document.getElementById('playerOverlay').classList.remove('hidden');
    document.getElementById('playerOverlay').classList.add('flex');
}
function closePlayer() {
    document.getElementById('playerOverlay').classList.add('hidden');
    document.getElementById('iframeContainer').innerHTML = '';
}
function closeModal() { document.getElementById('detailModal').classList.add('hidden'); }

initApp();
