const pool = require('../config/database');

exports.createNews = async (req, res) => {
    try {
        const { title, content, published_date, published_time } = req.body;
        const authorId = req.user.id;

        let publishedAt = new Date();
        if (published_date) {
            publishedAt = new Date(published_date);
            // If time is provided, set it
            if (published_time) {
                const [hours, minutes] = published_time.split(':');
                publishedAt.setHours(hours, minutes);
            }
        }

        await pool.execute(
            `INSERT INTO news (title, content, published_at, is_published, author_id, slug) 
       VALUES (?, ?, ?, 1, ?, ?)`,
            [title, content, publishedAt, authorId, title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now()]
        );

        req.flash('success', 'News posted successfully');
        res.redirect('/admin');
    } catch (error) {
        console.error('Error creating news:', error);
        req.flash('error', 'Failed to post news');
        res.redirect('/admin');
    }
};

exports.deleteNews = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM news WHERE id = ?', [id]);
        req.flash('success', 'News deleted successfully');
        res.redirect('/admin');
    } catch (error) {
        console.error('Error deleting news:', error);
        req.flash('error', 'Failed to delete news');
        res.redirect('/admin');
    }
};
