import { PropTypes } from 'prop-types';
import { Link } from 'react-router-dom';
import './GroupCard.css';

export default function GroupCard({ group, currentUserId }) {
    const isOwner = currentUserId && group.created_by === currentUserId;
    const isMember = currentUserId && (group.members ?? []).some((m) => m._id === currentUserId);

    return (
        <Link to={`/groups/${group._id}`} className='group-card-link'>
            <div className='group-card'>
                <div className='group-card-header'>
                    <h3 className='group-card-name'>{group.name}</h3>
                    {group.course_code && (
                        <span className='group-card-course'>{group.course_code}</span>
                    )}
                </div>

                {isOwner && <span className='group-card-badge owner-badge'>Owner</span>}
                {!isOwner && isMember && (
                    <span className='group-card-badge member-badge'>Member</span>
                )}

                <p className='group-card-description'>
                    {group.description || 'No description provided.'}
                </p>

                <div className='group-card-meta'>
                    <span className='group-card-members'>
                        {(group.members ?? []).length}/{group.max_members} members
                    </span>
                    <div className='group-card-tags'>
                        {(group.tags ?? []).map((tag) => (
                            <span key={tag} className='skill-badge'>
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </Link>
    );
}

GroupCard.propTypes = {
    group: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        course_code: PropTypes.string,
        max_members: PropTypes.number.isRequired,
        tags: PropTypes.arrayOf(PropTypes.string),
        created_by: PropTypes.string.isRequired,
        members: PropTypes.arrayOf(
            PropTypes.shape({
                _id: PropTypes.string.isRequired,
                full_name: PropTypes.string.isRequired,
            })
        ),
    }).isRequired,
    currentUserId: PropTypes.string,
};
