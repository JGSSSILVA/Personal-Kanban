import React, { useState, useEffect, useRef } from 'react';

function CitySearch({ onSelect, required, value, onChange }) {
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Use the prop value if provided, otherwise default to empty string
    const inputValue = value !== undefined ? value : '';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchCities = async () => {
            if (inputValue.length < 3) {
                setResults([]);
                return;
            }

            try {
                const response = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputValue)}&count=5&language=en&format=json`
                );
                const data = await response.json();
                if (data.results) {
                    setResults(data.results);
                    setIsOpen(true);
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error("Search error:", error);
            }
        };

        const timeoutId = setTimeout(searchCities, 500);
        return () => clearTimeout(timeoutId);
    }, [inputValue]);

    const handleSelect = (city) => {
        if (onChange) onChange(`${city.name}, ${city.country}`);
        setIsOpen(false);
        onSelect(city);
    };

    return (
        <div className="city-search-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
            <input
                type="text"
                placeholder="City (e.g. London)"
                value={inputValue}
                onChange={(e) => onChange && onChange(e.target.value)}
                required={required}
                onFocus={() => inputValue.length >= 3 && setIsOpen(true)}
            />
            {isOpen && results.length > 0 && (
                <ul className="city-dropdown">
                    {results.map((city) => (
                        <li key={city.id} onClick={() => handleSelect(city)}>
                            {city.name}, {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default CitySearch;
