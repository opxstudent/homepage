'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    BookOpen, Plus, X, Star, ArrowLeft, Edit2, Trash2, Check,
    ArrowUp, ArrowRight, ArrowDown, BookMarked,
    Bold, Italic, Underline, Heading, List, ListOrdered,
    Search, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { Book, getBooks, addBook, updateBook, deleteBook } from '@/lib/libraryUtils';
import BookCard from '@/components/Library/BookCard';

type ViewState = 'hub' | 'book_detail';

const CURRENT_YEAR = new Date().getFullYear();

const ALL_GENRES = ['Fiction', 'Non-Fiction', 'Sci-Fi', 'Fantasy', 'Biography', 'Self-Help', 'Business', 'History', 'Philosophy', 'Psychology', 'Tech', 'Other'];

const priorityConfig = {
    high: { icon: ArrowUp, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'High' },
    medium: { icon: ArrowRight, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
    low: { icon: ArrowDown, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Low' },
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    'to-read': { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'To Read' },
    'reading': { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Reading' },
    'finished': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Finished' },
};

export default function LibraryPage() {
    const [view, setView] = useState<ViewState>('hub');
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Add book modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newAuthor, setNewAuthor] = useState('');
    const [newGenres, setNewGenres] = useState<string[]>([]);
    const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newCoverUrl, setNewCoverUrl] = useState('');

    // Book detail editing
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotesValue, setEditNotesValue] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Edit details
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editAuthor, setEditAuthor] = useState('');
    const [editGenres, setEditGenres] = useState<string[]>([]);
    const [editCoverUrl, setEditCoverUrl] = useState('');
    const [editPriority, setEditPriority] = useState<Book['priority']>('medium');
    const notesRef = useRef<HTMLDivElement>(null);
    const topShelfRef = useRef<HTMLDivElement>(null);
    const collectionRef = useRef<HTMLDivElement>(null);
    const finishedRef = useRef<HTMLDivElement>(null);

    // Search & Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGenre, setFilterGenre] = useState('');
    const [filterAuthor, setFilterAuthor] = useState('');
    const [filterRating, setFilterRating] = useState(0);

    const scrollShelf = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
        if (!ref.current) return;
        const scrollAmount = ref.current.clientWidth * 0.8;
        ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    };

    const execFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        notesRef.current?.focus();
    };

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const booksData = await getBooks();
        setBooks(booksData);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ─── ACTIONS ───

    const handleAddBook = async () => {
        if (!newTitle.trim()) return;
        const book = await addBook({
            title: newTitle.trim(),
            author: newAuthor.trim() || null,
            genre: newGenres.length > 0 ? newGenres : null,
            priority: newPriority,
            status: 'to-read',
            cover_url: newCoverUrl.trim() || null,
        });
        if (book) {
            setBooks(prev => [book, ...prev]);
            resetAddModal();
        }
    };

    const resetAddModal = () => {
        setShowAddModal(false);
        setNewTitle('');
        setNewAuthor('');
        setNewGenres([]);
        setNewPriority('medium');
        setNewCoverUrl('');
    };

    const handleStatusChange = async (book: Book, newStatus: Book['status']) => {
        const success = await updateBook(book.id, { status: newStatus });
        if (success) {
            await loadData();
            if (selectedBook?.id === book.id) {
                const updated = await getBooks();
                setSelectedBook(updated.find(b => b.id === book.id) || null);
            }
        }
    };

    const startEditingDetails = () => {
        if (!selectedBook) return;
        setEditTitle(selectedBook.title);
        setEditAuthor(selectedBook.author || '');
        setEditGenres(selectedBook.genre || []);
        setEditCoverUrl(selectedBook.cover_url || '');
        setEditPriority(selectedBook.priority);
        setIsEditingDetails(true);
    };

    const handleSaveDetails = async () => {
        if (!selectedBook || !editTitle.trim()) return;
        const patch: Partial<Book> = {
            title: editTitle.trim(),
            author: editAuthor.trim() || null,
            genre: editGenres.length > 0 ? editGenres : null,
            cover_url: editCoverUrl.trim() || null,
            priority: editPriority,
        };
        const success = await updateBook(selectedBook.id, patch);
        if (success) {
            const updated = { ...selectedBook, ...patch };
            setSelectedBook(updated);
            setBooks(prev => prev.map(b => b.id === selectedBook.id ? updated : b));
            setIsEditingDetails(false);
        }
    };

    const handleRatingChange = async (book: Book, rating: number) => {
        const success = await updateBook(book.id, { rating });
        if (success) {
            const updated = { ...book, rating };
            setBooks(prev => prev.map(b => b.id === book.id ? updated : b));
            if (selectedBook?.id === book.id) setSelectedBook(updated);
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedBook || !notesRef.current) return;
        const html = notesRef.current.innerHTML;
        const success = await updateBook(selectedBook.id, { notes: html });
        if (success) {
            const updated = { ...selectedBook, notes: html };
            setSelectedBook(updated);
            setBooks(prev => prev.map(b => b.id === selectedBook.id ? updated : b));
            setIsEditingNotes(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBook) return;
        const success = await deleteBook(selectedBook.id);
        if (success) {
            setBooks(prev => prev.filter(b => b.id !== selectedBook.id));
            setSelectedBook(null);
            setShowDeleteConfirm(false);
            setView('hub');
            await loadData();
        }
    };

    const openBookDetail = (book: Book) => {
        setSelectedBook(book);
        setEditNotesValue(book.notes || '');
        setIsEditingNotes(false);
        setShowDeleteConfirm(false);
        setView('book_detail');
    };

    // ─── DERIVED FILTER OPTIONS ───

    const uniqueGenres = Array.from(new Set(books.flatMap(b => b.genre || []))).sort();
    const uniqueAuthors = Array.from(new Set(books.map(b => b.author).filter(Boolean) as string[])).sort();
    const hasActiveFilters = !!filterGenre || !!filterAuthor || filterRating > 0;

    // ─── SHELF DATA (filtered by search + filters) ───

    const matchesFilters = (book: Book) => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!book.title.toLowerCase().includes(q) && !(book.author || '').toLowerCase().includes(q)) return false;
        }
        if (filterGenre && !(book.genre || []).includes(filterGenre)) return false;
        if (filterAuthor && book.author !== filterAuthor) return false;
        if (filterRating > 0 && (book.rating || 0) < filterRating) return false;
        return true;
    };

    const readingDesk = books.filter(b => b.status === 'reading' && matchesFilters(b));
    const topShelf = books.filter(b => b.status === 'to-read' && b.priority === 'high' && matchesFilters(b));
    const collection = books.filter(b => b.status === 'to-read' && b.priority !== 'high' && matchesFilters(b));
    const hallOfFame = books.filter(b => b.status === 'finished' && matchesFilters(b));

    // ─── RENDERERS ───

    const renderHub = () => (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-300">
            {/* Header with Search + Add */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search books..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1a1a1c] border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-white/10 transition-colors"
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl shadow-lg hover:brightness-110 transition-all active:scale-95 shrink-0"
                >
                    <Plus size={18} />
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={14} className="text-text-secondary shrink-0" />
                <select
                    value={filterGenre}
                    onChange={e => setFilterGenre(e.target.value)}
                    className="bg-[#1a1a1c] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/10 appearance-none cursor-pointer"
                >
                    <option value="">All Genres</option>
                    {uniqueGenres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                    value={filterAuthor}
                    onChange={e => setFilterAuthor(e.target.value)}
                    className="bg-[#1a1a1c] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/10 appearance-none cursor-pointer"
                >
                    <option value="">All Authors</option>
                    {uniqueAuthors.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select
                    value={filterRating}
                    onChange={e => setFilterRating(Number(e.target.value))}
                    className="bg-[#1a1a1c] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/10 appearance-none cursor-pointer"
                >
                    <option value={0}>Any Rating</option>
                    <option value={1}>≥ 1 ★</option>
                    <option value={2}>≥ 2 ★</option>
                    <option value={3}>≥ 3 ★</option>
                    <option value={4}>≥ 4 ★</option>
                    <option value={5}>5 ★</option>
                </select>
                {hasActiveFilters && (
                    <button
                        onClick={() => { setFilterGenre(''); setFilterAuthor(''); setFilterRating(0); }}
                        className="text-[10px] text-text-secondary hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <BookMarked size={18} className="text-emerald-400" />
                </div>
                <p className="text-xs text-text-secondary">
                    <span className="text-white font-bold text-lg tabular-nums">{hallOfFame.length}</span>{' '}
                    books finished in {CURRENT_YEAR}
                </p>
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-text-secondary animate-pulse">Loading library...</div>
            ) : books.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <BookOpen size={40} className="mx-auto text-white/10 mb-3" />
                    <p className="text-text-secondary text-sm">Your library is empty. Add your first book!</p>
                </div>
            ) : (readingDesk.length === 0 && topShelf.length === 0 && collection.length === 0 && hallOfFame.length === 0) ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
                    <Search size={32} className="mx-auto text-white/10 mb-3" />
                    <p className="text-text-secondary text-sm">No books match your search{hasActiveFilters ? ' and filters' : ''}</p>
                </div>
            ) : (
                <>
                    {/* ── Reading Desk ── */}
                    {readingDesk.length > 0 && (
                        <section>
                            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <BookMarked size={14} className="text-blue-400" />
                                The Reading Desk
                                <span className="text-[10px] bg-white/5 text-text-secondary rounded-full px-1.5 py-0.5 font-medium normal-case tracking-normal">{readingDesk.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {readingDesk.map(book => (
                                    <div key={book.id} className="group flex bg-[#1a1a1c] border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all">
                                        <button
                                            onClick={() => openBookDetail(book)}
                                            className="w-28 md:w-36 shrink-0 bg-gradient-to-br from-white/5 to-transparent text-left"
                                        >
                                            {book.cover_url ? (
                                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center aspect-[2/3]">
                                                    <BookOpen size={32} className="text-white/10" />
                                                </div>
                                            )}
                                        </button>
                                        <div className="p-4 md:p-5 flex flex-col justify-between min-w-0 flex-1">
                                            <div>
                                                <button onClick={() => openBookDetail(book)} className="text-left">
                                                    <h3 className="font-semibold text-white text-base md:text-lg group-hover:text-blue-400 transition-colors line-clamp-2">
                                                        {book.title}
                                                    </h3>
                                                </button>
                                                {book.author && <p className="text-sm text-text-secondary mt-0.5">{book.author}</p>}
                                                {book.genre && book.genre.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {book.genre.slice(0, 3).map(g => (
                                                            <span key={g} className="text-[10px] font-medium text-text-secondary bg-white/5 rounded-full px-2 py-0.5">{g}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleStatusChange(book, 'finished')}
                                                className="mt-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 w-fit"
                                            >
                                                <Check size={14} /> Mark as Finished
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Top Shelf ── */}
                    {topShelf.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <ArrowUp size={14} className="text-red-400" />
                                    The Top Shelf
                                    <span className="text-[10px] bg-white/5 text-text-secondary rounded-full px-1.5 py-0.5 font-medium normal-case tracking-normal">{topShelf.length}</span>
                                </h2>
                                <div className="flex gap-1">
                                    <button onClick={() => scrollShelf(topShelfRef, 'left')} className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"><ChevronLeft size={16} /></button>
                                    <button onClick={() => scrollShelf(topShelfRef, 'right')} className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                            <div ref={topShelfRef} className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                                {topShelf.map(book => (
                                    <button
                                        key={book.id}
                                        onClick={() => openBookDetail(book)}
                                        className="group shrink-0 w-32 md:w-36 text-left"
                                    >
                                        <div className="aspect-[2/3] bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl overflow-hidden border border-white/5 group-hover:border-red-500/30 transition-all group-hover:scale-[1.02] group-active:scale-[0.98]">
                                            {book.cover_url ? (
                                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <BookOpen size={28} className="text-white/10" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xs font-semibold text-white mt-2 truncate group-hover:text-red-400 transition-colors">{book.title}</h3>
                                        {book.author && <p className="text-[10px] text-text-secondary truncate">{book.author}</p>}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Collection ── */}
                    {collection.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen size={14} />
                                    The Collection
                                    <span className="text-[10px] bg-white/5 text-text-secondary rounded-full px-1.5 py-0.5 font-medium normal-case tracking-normal">{collection.length}</span>
                                </h2>
                                <div className="flex gap-1">
                                    <button onClick={() => scrollShelf(collectionRef, 'left')} className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"><ChevronLeft size={16} /></button>
                                    <button onClick={() => scrollShelf(collectionRef, 'right')} className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                            <div ref={collectionRef} className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                                {collection.map(book => (
                                    <button
                                        key={book.id}
                                        onClick={() => openBookDetail(book)}
                                        className="group shrink-0 w-32 md:w-36 text-left"
                                    >
                                        <div className="aspect-[2/3] bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl overflow-hidden border border-white/5 group-hover:border-white/20 transition-all group-hover:scale-[1.02] group-active:scale-[0.98]">
                                            {book.cover_url ? (
                                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <BookOpen size={28} className="text-white/10" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xs font-semibold text-white mt-2 truncate group-hover:text-emerald-400 transition-colors">{book.title}</h3>
                                        {book.author && <p className="text-[10px] text-text-secondary truncate">{book.author}</p>}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Finished ── */}
                    {hallOfFame.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <Star size={14} className="text-amber-400" />
                                    Finished
                                    <span className="text-[10px] bg-white/5 text-text-secondary rounded-full px-1.5 py-0.5 font-medium normal-case tracking-normal">{hallOfFame.length}</span>
                                </h2>
                                <div className="flex gap-1">
                                    <button onClick={() => scrollShelf(finishedRef, 'left')} className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"><ChevronLeft size={16} /></button>
                                    <button onClick={() => scrollShelf(finishedRef, 'right')} className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                            <div ref={finishedRef} className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                                {hallOfFame.map(book => (
                                    <button
                                        key={book.id}
                                        onClick={() => openBookDetail(book)}
                                        className="group shrink-0 w-32 md:w-36 text-left"
                                    >
                                        <div className="aspect-[2/3] bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl overflow-hidden border border-white/5 group-hover:border-amber-500/30 transition-all group-hover:scale-[1.02] group-active:scale-[0.98]">
                                            {book.cover_url ? (
                                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <BookOpen size={28} className="text-white/10" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xs font-semibold text-white mt-2 truncate group-hover:text-amber-400 transition-colors">{book.title}</h3>
                                        {book.author && <p className="text-[10px] text-text-secondary truncate">{book.author}</p>}
                                        <div className="flex items-center gap-0.5 mt-1">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={10}
                                                    className={i < (book.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/10'}
                                                />
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );

    const renderBookDetail = () => {
        if (!selectedBook) return null;
        const prio = priorityConfig[selectedBook.priority];
        const PrioIcon = prio.icon;
        const status = statusConfig[selectedBook.status];

        return (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
                {/* Back */}
                <button
                    onClick={() => { setView('hub'); setSelectedBook(null); }}
                    className="flex items-center gap-2 text-text-secondary hover:text-white text-sm mb-6 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Library
                </button>

                {/* Header Card */}
                <div className="flex flex-col md:flex-row gap-6 bg-[#1a1a1c] border border-white/5 rounded-2xl p-5 md:p-6 mb-6">
                    {/* Cover */}
                    <div className="w-32 md:w-40 shrink-0 mx-auto md:mx-0">
                        <div className="aspect-[2/3] bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl overflow-hidden">
                            {selectedBook.cover_url ? (
                                <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen size={40} className="text-white/10" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl md:text-2xl font-bold text-white">{selectedBook.title}</h1>
                            <button
                                onClick={() => isEditingDetails ? handleSaveDetails() : startEditingDetails()}
                                className="p-1.5 text-text-secondary hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                                {isEditingDetails ? <Check size={16} /> : <Edit2 size={16} />}
                            </button>
                        </div>

                        {isEditingDetails ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    placeholder="Title"
                                    className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                />
                                <input
                                    type="text"
                                    value={editAuthor}
                                    onChange={e => setEditAuthor(e.target.value)}
                                    placeholder="Author"
                                    className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                />
                                <input
                                    type="text"
                                    value={editCoverUrl}
                                    onChange={e => setEditCoverUrl(e.target.value)}
                                    placeholder="Cover image URL"
                                    className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                />
                                {/* Genre Chips */}
                                <div>
                                    <p className="text-xs text-text-secondary mb-1.5">Genre</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ALL_GENRES.map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setEditGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${editGenres.includes(g)
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-white/5 text-text-secondary border border-white/5 hover:border-white/10'
                                                    }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Priority */}
                                <div>
                                    <p className="text-xs text-text-secondary mb-1.5">Priority</p>
                                    <div className="flex gap-2">
                                        {(['low', 'medium', 'high'] as const).map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setEditPriority(p)}
                                                className={`text-xs px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${editPriority === p
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-white/5 text-text-secondary border border-white/5 hover:border-white/10'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => setIsEditingDetails(false)}
                                        className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveDetails}
                                        className="px-4 py-1.5 bg-emerald-500 text-[#0a0a0b] rounded-lg text-xs font-bold hover:bg-emerald-400 transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {selectedBook.author && <p className="text-text-secondary">{selectedBook.author}</p>}

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${status.bg} ${status.color}`}>
                                        {status.label}
                                    </span>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${prio.bg} ${prio.color} border ${prio.border}`}>
                                        <PrioIcon size={12} /> {prio.label}
                                    </span>
                                </div>

                                {selectedBook.genre && selectedBook.genre.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedBook.genre.map(g => (
                                            <span key={g} className="text-[11px] font-medium text-text-secondary bg-white/5 rounded-full px-2.5 py-0.5">{g}</span>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Rating */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleRatingChange(selectedBook, i + 1)}
                                    className="p-0.5 hover:scale-125 transition-transform"
                                >
                                    <Star
                                        size={18}
                                        className={i < (selectedBook.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/15 hover:text-amber-400/50'}
                                    />
                                </button>
                            ))}
                            {selectedBook.rating && <span className="text-xs text-text-secondary ml-1">{selectedBook.rating}/5</span>}
                        </div>

                        {/* Finished Date */}
                        {selectedBook.finished_date && (
                            <p className="text-xs text-emerald-400/70">Finished on {selectedBook.finished_date}</p>
                        )}

                        {/* Status Actions */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {selectedBook.status !== 'reading' && (
                                <button
                                    onClick={() => handleStatusChange(selectedBook, 'reading')}
                                    className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-500/20 transition-colors"
                                >
                                    Mark as Reading
                                </button>
                            )}
                            {selectedBook.status !== 'finished' && (
                                <button
                                    onClick={() => handleStatusChange(selectedBook, 'finished')}
                                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
                                >
                                    <Check size={14} /> Mark as Finished
                                </button>
                            )}
                            {selectedBook.status !== 'to-read' && (
                                <button
                                    onClick={() => handleStatusChange(selectedBook, 'to-read')}
                                    className="px-4 py-2 bg-white/5 border border-white/10 text-text-secondary rounded-xl text-xs font-bold hover:bg-white/10 transition-colors"
                                >
                                    Move to To-Read
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notes Section */}
                <div className="bg-[#1a1a1c] border border-white/5 rounded-2xl p-5 md:p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Notes & Takeaways</h2>
                        <button
                            onClick={() => {
                                if (isEditingNotes) {
                                    handleSaveNotes();
                                } else {
                                    setEditNotesValue(selectedBook.notes || '');
                                    setIsEditingNotes(true);
                                }
                            }}
                            className="p-1.5 text-text-secondary hover:text-white transition-colors rounded-lg hover:bg-white/5"
                        >
                            {isEditingNotes ? <Check size={16} /> : <Edit2 size={16} />}
                        </button>
                    </div>

                    {isEditingNotes ? (
                        <div className="space-y-3">
                            {/* Formatting Toolbar */}
                            <div className="flex items-center gap-1 p-1.5 bg-white/5 rounded-xl border border-white/5 flex-wrap">
                                <button onMouseDown={e => { e.preventDefault(); execFormat('bold'); }} title="Bold" className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"><Bold size={14} /></button>
                                <button onMouseDown={e => { e.preventDefault(); execFormat('italic'); }} title="Italic" className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"><Italic size={14} /></button>
                                <button onMouseDown={e => { e.preventDefault(); execFormat('underline'); }} title="Underline" className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"><Underline size={14} /></button>
                                <div className="w-px h-4 bg-white/10 mx-1" />
                                <button onMouseDown={e => { e.preventDefault(); execFormat('formatBlock', 'h2'); }} title="Heading" className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"><Heading size={14} /></button>
                                <button onMouseDown={e => { e.preventDefault(); execFormat('insertUnorderedList'); }} title="Bullet List" className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"><List size={14} /></button>
                                <button onMouseDown={e => { e.preventDefault(); execFormat('insertOrderedList'); }} title="Numbered List" className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"><ListOrdered size={14} /></button>
                            </div>
                            {/* WYSIWYG Editor */}
                            <div
                                ref={notesRef}
                                contentEditable
                                suppressContentEditableWarning
                                dangerouslySetInnerHTML={{ __html: editNotesValue }}
                                className="w-full min-h-[200px] bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-text-secondary focus:outline-none transition-all [&_strong]:text-white [&_b]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-secondary/70"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsEditingNotes(false)}
                                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveNotes}
                                    className="px-4 py-1.5 bg-emerald-500 text-[#0a0a0b] rounded-lg text-xs font-bold hover:bg-emerald-400 transition-colors"
                                >
                                    Save Notes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-text-secondary [&_strong]:text-white [&_b]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-secondary/70 [&_a]:text-emerald-400">
                            {selectedBook.notes ? (
                                <div dangerouslySetInnerHTML={{ __html: selectedBook.notes }} />
                            ) : (
                                <p className="text-text-secondary/50 italic">No notes yet. Click the edit icon to add some.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Danger Zone */}
                <div className="flex justify-end mb-20">
                    {showDeleteConfirm ? (
                        <div className="flex items-center gap-2 animate-in fade-in duration-200">
                            <span className="text-xs text-text-secondary">Permanently delete?</span>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-3 py-1.5 bg-white/5 text-text-secondary rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={14} /> Delete Book
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ─── ADD BOOK MODAL ───

    const renderAddModal = () => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg font-bold text-white">Add Book</h3>
                    <button onClick={resetAddModal} className="text-text-secondary hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-1.5 ml-1">Title *</label>
                        <input
                            autoFocus
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddBook()}
                            placeholder="Book title"
                            className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                        />
                    </div>

                    {/* Author */}
                    <div>
                        <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-1.5 ml-1">Author</label>
                        <input
                            value={newAuthor}
                            onChange={e => setNewAuthor(e.target.value)}
                            placeholder="Author name"
                            className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                        />
                    </div>

                    {/* Genre multi-select */}
                    <div>
                        <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-1.5 ml-1">Genres</label>
                        <div className="flex flex-wrap gap-1.5">
                            {ALL_GENRES.map(g => (
                                <button
                                    key={g}
                                    onClick={() => setNewGenres(prev =>
                                        prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                                    )}
                                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${newGenres.includes(g)
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-white/5 border-white/5 text-text-secondary hover:border-white/10'
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-1.5 ml-1">Priority</label>
                        <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl">
                            {(['low', 'medium', 'high'] as const).map(p => {
                                const cfg = priorityConfig[p];
                                const Icon = cfg.icon;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setNewPriority(p)}
                                        className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${newPriority === p ? `${cfg.bg} ${cfg.color}` : 'text-text-secondary hover:text-white/80'}`}
                                    >
                                        <Icon size={10} /> {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cover URL */}
                    <div>
                        <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-1.5 ml-1">Cover URL (optional)</label>
                        <input
                            value={newCoverUrl}
                            onChange={e => setNewCoverUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleAddBook}
                        disabled={!newTitle.trim()}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-[#0a0a0b] rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-30 active:scale-[0.98]"
                    >
                        Add to Library
                    </button>
                </div>
            </div>
        </div>
    );

    // ─── MAIN LAYOUT ───

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            {/* Page Header */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-xl">
                            <BookOpen size={22} className="text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-white">Library</h1>
                            <p className="text-xs text-text-secondary">{books.length} books</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Views */}
            {view === 'hub' && renderHub()}
            {view === 'book_detail' && renderBookDetail()}

            {/* Add Modal */}
            {showAddModal && renderAddModal()}
        </div>
    );
}
