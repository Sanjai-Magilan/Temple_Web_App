/**
 * Admin Booking Controller
 * Handles booking management for admins
 */

const pool = require('../../config/database');

/**
 * List all bookings with search functionality
 */
exports.list = async (req, res) => {
    let hallQuery = '';
    let poojaQuery = '';
    let hallQueryParams = [];
    let poojaQueryParams = [];

    // Pagination
    const limit = 12;
    const hallPage = parseInt(req.query.hallPage) || 1;
    const poojaPage = parseInt(req.query.poojaPage) || 1;
    const hallOffset = (hallPage - 1) * limit;
    const poojaOffset = (poojaPage - 1) * limit;

    try {
        const hallSearch = (req.query.hallSearch || '').toString().trim();
        const poojaSearch = (req.query.poojaSearch || '').toString().trim();

        // Base Queries
        let hallBaseQuery = `
            FROM hall_bookings hb
            JOIN users u ON hb.user_id = u.id
            LEFT JOIN payments p ON hb.payment_id = p.id
            WHERE hb.status != 'pending'
        `;

        let poojaBaseQuery = `
            FROM pooja_bookings pb
            JOIN users u ON pb.user_id = u.id
            LEFT JOIN payments p ON pb.payment_id = p.id
            WHERE pb.status != 'pending'
        `;

        // Search Logic
        if (hallSearch) {
            let whereClause = ` AND (p.payment_id LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR hb.hall_name LIKE ? OR hb.booking_date LIKE ? OR DATE_FORMAT(hb.booking_date, '%e/%c/%Y') LIKE ? OR DATE_FORMAT(hb.booking_date, '%m/%d/%Y') LIKE ? OR hb.event_type LIKE ? OR hb.status LIKE ? OR hb.booking_number LIKE ?`;
            const baseParams = [
                `%${hallSearch}%`, `%${hallSearch}%`, `%${hallSearch}%`, `%${hallSearch}%`, 
                `%${hallSearch}%`, `%${hallSearch}%`, `%${hallSearch}%`, `%${hallSearch}%`,
                `%${hallSearch}%`, `%${hallSearch}%`
            ];
            if (!isNaN(hallSearch)) {
                whereClause += ` OR u.id = ?)`;
                baseParams.push(hallSearch);
            } else {
                whereClause += `)`;
            }
            hallBaseQuery += whereClause;
            hallQueryParams = [...baseParams];
        }

        if (poojaSearch) {
            let whereClause = ` AND (p.payment_id LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR pb.pooja_name LIKE ? OR pb.booking_date LIKE ? OR DATE_FORMAT(pb.booking_date, '%e/%c/%Y') LIKE ? OR DATE_FORMAT(pb.booking_date, '%m/%d/%Y') LIKE ? OR pb.status LIKE ? OR pb.booking_number LIKE ?`;
            const baseParams = [
                `%${poojaSearch}%`, `%${poojaSearch}%`, `%${poojaSearch}%`, `%${poojaSearch}%`,
                `%${poojaSearch}%`, `%${poojaSearch}%`, `%${poojaSearch}%`, `%${poojaSearch}%`, 
                `%${poojaSearch}%`
            ];
            if (!isNaN(poojaSearch)) {
                whereClause += ` OR u.id = ?)`;
                baseParams.push(poojaSearch);
            } else {
                whereClause += `)`;
            }
            poojaBaseQuery += whereClause;
            poojaQueryParams = [...baseParams];
        }

        // Apply explicit filters if provided
        const filterHallName = req.query.filterHallName;
        const filterHallDate = req.query.filterHallDate;
        const filterHallStatus = req.query.filterHallStatus;

        if (filterHallName) {
            hallBaseQuery += ` AND hb.hall_name = ?`;
            hallQueryParams.push(filterHallName);
        }
        if (filterHallDate) {
            hallBaseQuery += ` AND hb.booking_date = ?`;
            hallQueryParams.push(filterHallDate);
        }
        if (filterHallStatus) {
            hallBaseQuery += ` AND hb.status = ?`;
            hallQueryParams.push(filterHallStatus);
        }

        const filterPoojaName = req.query.filterPoojaName;
        const filterPoojaDate = req.query.filterPoojaDate;
        const filterPoojaStatus = req.query.filterPoojaStatus;

        if (filterPoojaName) {
            poojaBaseQuery += ` AND pb.pooja_name = ?`;
            poojaQueryParams.push(filterPoojaName);
        }
        if (filterPoojaDate) {
            poojaBaseQuery += ` AND pb.booking_date = ?`;
            poojaQueryParams.push(filterPoojaDate);
        }
        if (filterPoojaStatus) {
            poojaBaseQuery += ` AND pb.status = ?`;
            poojaQueryParams.push(filterPoojaStatus);
        }

        // Count Queries
        const [hallCountResult] = await pool.execute(`SELECT COUNT(*) as count ${hallBaseQuery}`, hallQueryParams);
        const hallTotal = hallCountResult[0].count;
        const hallTotalPages = Math.ceil(hallTotal / limit);

        const [poojaCountResult] = await pool.execute(`SELECT COUNT(*) as count ${poojaBaseQuery}`, poojaQueryParams);
        const poojaTotal = poojaCountResult[0].count;
        const poojaTotalPages = Math.ceil(poojaTotal / limit);

        // Filter/Sort Logic
        const hallFilter = req.query.hallFilter || 'upcoming';
        const poojaFilter = req.query.poojaFilter || 'upcoming';

        if (hallFilter === 'recent') {
            hallBaseQuery += ` ORDER BY hb.id DESC`;
        } else {
            hallBaseQuery += ` ORDER BY (hb.booking_date >= CURRENT_DATE()) DESC, hb.booking_date ASC, hb.start_time ASC`;
        }

        if (poojaFilter === 'recent') {
            poojaBaseQuery += ` ORDER BY pb.id DESC`;
        } else {
            poojaBaseQuery += ` ORDER BY (pb.booking_date >= CURRENT_DATE()) DESC, pb.booking_date ASC, pb.booking_time ASC`;
        }

        // Final Data Queries with Pagination
        hallQuery = `SELECT hb.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.email as user_email, p.payment_id as razorpay_payment_id, p.status as payment_status ${hallBaseQuery} LIMIT ${limit} OFFSET ${hallOffset}`;
        poojaQuery = `SELECT pb.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.email as user_email, p.payment_id as razorpay_payment_id, p.status as payment_status ${poojaBaseQuery} LIMIT ${limit} OFFSET ${poojaOffset}`;

        const [hallBookings] = await pool.execute(hallQuery, hallQueryParams);
        const [poojaBookings] = await pool.execute(poojaQuery, poojaQueryParams);

        const activeTab = req.query.activeTab || (poojaSearch || poojaFilter !== 'upcoming' || poojaPage > 1 ? 'pooja' : 'hall');

        // Pagination Data Objects
        const hallPagination = {
            currentPage: hallPage,
            totalPages: hallTotalPages,
            hasNextPage: hallPage < hallTotalPages,
            hasPrevPage: hallPage > 1
        };

        const poojaPagination = {
            currentPage: poojaPage,
            totalPages: poojaTotalPages,
            hasNextPage: poojaPage < poojaTotalPages,
            hasPrevPage: poojaPage > 1
        };

        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            res.set('Cache-Control', 'no-store');
            if (activeTab === 'hall') {
                return res.render('admin/manage_booking/hall_bookings', { hallBookings, hallPagination });
            } else {
                return res.render('admin/manage_booking/pooja_bookings', { poojaBookings, poojaPagination });
            }
        }

        res.render('admin/manage_booking/manage_booking', {
            title: 'Manage Bookings',
            path: '/admin/bookings',
            hallBookings,
            poojaBookings,
            hallPagination,
            poojaPagination,
            activeTab,
            hallSearch,
            poojaSearch,
            hallFilter,
            poojaFilter,
            filterHallName,
            filterHallDate,
            filterHallStatus,
            filterPoojaName,
            filterPoojaDate,
            filterPoojaStatus,
            pageTitle: 'Manage Bookings'
        });

    } catch (error) {
        console.error('Error listing bookings:', error);
        console.error('Hall Query:', hallQuery);
        console.error('Pooja Query:', poojaQuery);
        console.error('Query Params:', hallQueryParams);
        res.status(500).render('errors/500', {
            title: 'Server Error',
            message: 'Failed to load bookings'
        });
    }
};
