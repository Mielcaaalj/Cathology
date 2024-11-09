let offset = 0;
const limit = 50;

const pokemonList = document.getElementById('pokemon-list');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const battleButton = document.getElementById('battle-button');
const battleModal = document.getElementById('battle-modal');
const closeModal = document.querySelector('.close');
const pokemon1Select = document.getElementById('pokemon1-select');
const pokemon2Select = document.getElementById('pokemon2-select');
const startBattleButton = document.getElementById('start-battle');
const battleResult = document.getElementById('battle-result');

let pokemonCache = new Map();

// Event Listeners
prevButton.addEventListener('click', () => {
    if (offset >= limit) {
        offset -= limit;
        fetchPokemons();
    }
});

nextButton.addEventListener('click', () => {
    offset += limit;
    fetchPokemons();
});

searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

battleButton.addEventListener('click', openBattleModal);
closeModal.addEventListener('click', () => battleModal.style.display = 'none');
pokemon1Select.addEventListener('change', updatePokemonInfo);
pokemon2Select.addEventListener('change', updatePokemonInfo);
startBattleButton.addEventListener('click', startBattle);

window.addEventListener('click', (e) => {
    if (e.target === battleModal) {
        battleModal.style.display = 'none';
    }
});

async function fetchPokemons() {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`);
        const data = await response.json();

        pokemonList.innerHTML = '';
        
        const promises = data.results.map(pokemon => createPokemonCard(pokemon));
        const cards = await Promise.all(promises);
        cards.forEach(card => pokemonList.appendChild(card));

        // Update button states
        prevButton.disabled = offset === 0;
        nextButton.disabled = !data.next;

    } catch (error) {
        console.error('Error fetching Pokemon:', error);
    }
}

async function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    
    const id = pokemon.url.split('/')[6];
    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${pokemon.name}">
        <h2>${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h2>
        <div class="pokemon-info">
            <p>ID: ${id}</p>
        </div>
    `;
    
    return card;
}

async function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm === '') return;

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchTerm}`);
        if (!response.ok) {
            throw new Error('Pokemon not found!');
        }
        const data = await response.json();
        
        // Clear the current display
        const pokemonList = document.getElementById('pokemon-list');
        pokemonList.innerHTML = '';
        
        // Display the searched Pokemon
        const pokemonCard = createPokemonCard({
            name: data.name,
            url: `https://pokeapi.co/api/v2/pokemon/${data.id}/`
        });
        pokemonList.appendChild(pokemonCard);
        
        // Disable pagination buttons during search
        document.getElementById('prev-button').disabled = true;
        document.getElementById('next-button').disabled = true;
    } catch (error) {
        alert('Pokemon not found! Please try again.');
    }
}

async function openBattleModal() {
    battleModal.style.display = 'block';
    battleResult.style.display = 'none';
    
    // Fetch all Pokemon for the select dropdowns
    try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
        const data = await response.json();
        
        const options = data.results
            .map((pokemon, index) => `<option value="${index + 1}">${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</option>`)
            .join('');
            
        pokemon1Select.innerHTML = '<option value="">Select Pokemon</option>' + options;
        pokemon2Select.innerHTML = '<option value="">Select Pokemon</option>' + options;
    } catch (error) {
        console.error('Error fetching Pokemon list:', error);
    }
}

async function updatePokemonInfo(event) {
    const selectElement = event.target;
    const pokemonId = selectElement.value;
    const infoDiv = document.getElementById(`pokemon${selectElement.id.charAt(7)}-info`);
    
    if (!pokemonId) {
        infoDiv.innerHTML = '';
        return;
    }
    
    try {
        let pokemonData;
        if (pokemonCache.has(pokemonId)) {
            pokemonData = pokemonCache.get(pokemonId);
        } else {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            pokemonData = await response.json();
            pokemonCache.set(pokemonId, pokemonData);
        }
        
        const speciesResponse = await fetch(pokemonData.species.url);
        const speciesData = await speciesResponse.json();
        
        const isEvolved = speciesData.evolves_from_species !== null;
        const evolutionBonus = isEvolved ? 1.5 : 1;
        const battlePower = calculateBattlePower(pokemonData, evolutionBonus);
        
        infoDiv.innerHTML = `
            <img src="${pokemonData.sprites.front_default}" alt="${pokemonData.name}">
            <p>Base Experience: ${pokemonData.base_experience}</p>
            <p>Types: ${pokemonData.types.map(type => type.type.name).join(', ')}</p>
            <p>Evolution Status: ${isEvolved ? 'Evolved' : 'Basic'}</p>
            <p>Battle Power: ${battlePower}</p>
        `;
    } catch (error) {
        console.error('Error fetching Pokemon details:', error);
        infoDiv.innerHTML = 'Error loading Pokemon information';
    }
}

function calculateBattlePower(pokemon, evolutionBonus) {
    const baseStats = pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0);
    const experience = pokemon.base_experience || 100;
    return Math.floor((baseStats + experience) * evolutionBonus);
}

async function startBattle() {
    const pokemon1Id = pokemon1Select.value;
    const pokemon2Id = pokemon2Select.value;
    
    if (!pokemon1Id || !pokemon2Id) {
        alert('Please select both Pokemon!');
        return;
    }
    
    try {
        const pokemon1Data = pokemonCache.get(pokemon1Id);
        const pokemon2Data = pokemonCache.get(pokemon2Id);
        
        const species1Response = await fetch(pokemon1Data.species.url);
        const species2Response = await fetch(pokemon2Data.species.url);
        const species1Data = await species1Response.json();
        const species2Data = await species2Response.json();
        
        const isEvolved1 = species1Data.evolves_from_species !== null;
        const isEvolved2 = species2Data.evolves_from_species !== null;
        
        const pokemon1Power = calculateBattlePower(pokemon1Data, isEvolved1 ? 1.5 : 1);
        const pokemon2Power = calculateBattlePower(pokemon2Data, isEvolved2 ? 1.5 : 1);
        
        // Add some randomness to make it more interesting
        const random = Math.random() * 0.2 - 0.1; // -10% to +10%
        const pokemon1FinalPower = pokemon1Power * (1 + random);
        const pokemon2FinalPower = pokemon2Power * (1 + random);
        
        const winner = pokemon1FinalPower > pokemon2FinalPower ? pokemon1Data : pokemon2Data;
        const winnerPower = pokemon1FinalPower > pokemon2FinalPower ? pokemon1FinalPower : pokemon2FinalPower;
        const loserPower = pokemon1FinalPower > pokemon2FinalPower ? pokemon2FinalPower : pokemon1FinalPower;
        
        battleResult.style.display = 'block';
        battleResult.style.backgroundColor = '#e8f5e9';
        battleResult.innerHTML = `
            <h3>${winner.name.toUpperCase()} WINS!</h3>
            <p>Battle Power Difference: ${Math.floor(Math.abs(winnerPower - loserPower))}</p>
            <img src="${winner.sprites.front_default}" alt="${winner.name}" style="width: 150px;">
        `;
    } catch (error) {
        console.error('Error during battle:', error);
        battleResult.style.display = 'block';
        battleResult.style.backgroundColor = '#ffebee';
        battleResult.textContent = 'Error occurred during battle!';
    }
}

fetchPokemons();
