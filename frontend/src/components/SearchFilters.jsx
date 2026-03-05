export default function SearchFilters({
    search,
    onSearchChange,
    major,
    onMajorChange,
    year,
    onYearChange,
    skills,
    onSkillsChange,
}) {
    <div className='search-filters'>
        <div className='search-input-container'>
            <input
                type='text'
                placeholder='Search by name'
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className='search-input'
            />
        </div>
        <div className='filters-grid'>
            <select
                value={major}
                onChange={(e) => onMajorChange(e.target.value)}
                className='filter-select'
            >
                <option value='all'>All Majors</option>
            </select>
            <select
                value={year}
                onChange={(e) => onYearChange(e.target.value)}
                className='filter-select'
            >
                <option value='all'>All Years</option>
            </select>
            <select
                value={skills}
                onChange={(e) => onSkillsChange(e.target.value)}
                className='filter-select'
            >
                <option value='all'>All Skills</option>
            </select>
        </div>
    </div>;
}
