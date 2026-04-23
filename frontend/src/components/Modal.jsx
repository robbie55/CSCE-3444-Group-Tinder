import { PropTypes } from 'prop-types';

export default function Modal({ isOpen, onClose, title, disableClose = false, children }) {
    if (!isOpen) return null;

    const handleOverlayClick = () => {
        if (!disableClose) onClose();
    };

    return (
        <div className='modal-overlay' onClick={handleOverlayClick}>
            <div className='modal-content' onClick={(e) => e.stopPropagation()}>
                <div className='modal-header'>
                    <h2>{title}</h2>
                    <button
                        className='modal-close'
                        onClick={onClose}
                        type='button'
                        disabled={disableClose}
                    >
                        &times;
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

Modal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    disableClose: PropTypes.bool,
    children: PropTypes.node,
};
