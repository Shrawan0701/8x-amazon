import { Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SearchBar() {
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  function submit(event) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form className="searchbar" onSubmit={submit}>
      <Search size={18} />
      <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search shoes, headphones, home tech..." />
      <button>Search</button>
    </form>
  );
}
