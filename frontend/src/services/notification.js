import toast from 'react-hot-toast';

const notify = {
    success: (msg) => toast.success(msg, { duration: 3000 }),
    error: (msg) => toast.error(msg, { duration: 4000 }),
    warning: (msg) => toast(msg, {
        duration: 3500,
        style: { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
        icon: '⚠️',
    }),
    info: (msg) => toast(msg, {
        duration: 3000,
        style: { background: '#E0F2FE', color: '#075985', border: '1px solid #BAE6FD' },
        icon: 'ℹ️',
    }),
};

export default notify;
