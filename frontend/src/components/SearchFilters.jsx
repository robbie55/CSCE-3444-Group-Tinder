import { PropTypes } from 'prop-types';
import './SearchFilters.css';

export default function SearchFilters({
    search,
    onSearchChange,
    major,
    onMajorChange,
    skills,
    onSkillsChange,
}) {
    return (
        <div className='filters'>
            <div className='input-container'>
                <input
                    type='text'
                    placeholder='Search by name'
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className='input'
                />
            </div>
            <div className='grid'>
                <select
                    value={major}
                    onChange={(e) => onMajorChange(e.target.value)}
                    className='select'
                >
                    <option value='all'>All Majors</option>
                    <option value='Computer Science'>Computer Science</option>
                    <option value='Computer Engineering'>Computer Engineering</option>
                    <option value='Information Technology'>Information Technology</option>
                    <option value='Data Science'>Data Science</option>
                    <option value='Cybersecurity'>Cyberseciruty</option>
                    <option value='Other'>Other</option>
                </select>
                <select
                    value={skills}
                    onChange={(e) => onSkillsChange(e.target.value)}
                    className='select'
                >
                    <option value='all'>All Skills</option>
                    <option value='Python'>Python</option>
                    <option value='C'>C</option>
                    <option value='C++'>C++</option>
                    <option value='C#'>C#</option>
                    <option value='JavaScript'>JavaScript</option>
                    <option value='Java'>Java</option>
                </select>
            </div>
        </div>
    );
}

SearchFilters.propTypes = {
    search: PropTypes.string.isRequired,
    major: PropTypes.string.isRequired,
    skills: PropTypes.string.isRequired,
    onSearchChange: PropTypes.func.isRequired,
    onMajorChange: PropTypes.func.isRequired,
    onSkillsChange: PropTypes.func.isRequired,
};
