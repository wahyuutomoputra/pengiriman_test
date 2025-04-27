'use client';
import { useState } from 'react';

interface WilayahAutocompleteProps {
  onSelect: (item: any) => void;
  level?: 'villages' | 'districts' | 'regencies' | 'provinces';
}

export default function WilayahAutocomplete({ onSelect, level = 'villages' }: WilayahAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [show, setShow] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      setShow(false);
      return;
    }
    const res = await fetch(`/api/wilayah?q=${encodeURIComponent(value)}&level=${level}`);
    const data = await res.json();
    setResults(data);
    setShow(true);
  };

  const handleSelect = (item: any) => {
    setQuery(item.name);
    setShow(false);
    onSelect(item);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        placeholder={`Cari ${level}...`}
      />
      {show && results.length > 0 && (
        <ul className="absolute z-10 bg-white border w-full max-h-60 overflow-auto">
          {results.map((item) => (
            <li
              key={item.id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(item)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 