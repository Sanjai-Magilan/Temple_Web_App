# Routes Summary

## All Available Routes

### Public Routes (No Authentication Required)
- `GET /` - Home page
- `GET /login` - Login page
- `POST /login` - Login handler
- `GET /register` - Registration page
- `POST /register` - Registration handler

### Protected Routes (Authentication Required)

#### Dashboard
- `GET /dashboard` - User dashboard
- `GET /admin` - Admin dashboard (admin only)

#### Donations
- `GET /donations` - List user donations
- `GET /donations/new` - New donation form
- `POST /payment/donation/order` - Create donation payment order

#### Hall Bookings
- `GET /bookings/hall` - List hall bookings
- `GET /bookings/hall/new` - New hall booking form
- `POST /payment/hall-booking/order` - Create hall booking payment order

#### Pooja Bookings
- `GET /bookings/pooja` - List pooja bookings
- `GET /bookings/pooja/new` - New pooja booking form
- `POST /payment/pooja-booking/order` - Create pooja booking payment order

#### Family Members
- `GET /family` - List family members
- `GET /family/member/add` - Add family member form
- `POST /family/member/add` - Handle add family member
- `GET /family/member/:id` - View family member details
- `GET /family/member/:id/edit` - Edit family member form
- `POST /family/member/:id/edit` - Handle edit family member
- `DELETE /family/member/:id` - Delete family member (AJAX)

#### Payments
- `POST /payment/verify` - Verify payment
- `POST /payment/webhook` - Razorpay webhook handler

#### Authentication
- `GET /logout` - Logout
- `POST /logout` - Logout handler

## Controllers

1. **indexController.js** - Home page
2. **authController.js** - Authentication (login, register, logout)
3. **dashboardController.js** - User and admin dashboards
4. **donationController.js** - Donation listing and forms
5. **hallBookingController.js** - Hall booking listing and forms
6. **poojaBookingController.js** - Pooja booking listing and forms
7. **paymentController.js** - Razorpay payment integration
8. **familyController.js** - Family member management (add, edit, view, delete)

## Models

1. **userModel.js** - User operations
2. **familyModel.js** - Family operations
3. **donationModel.js** - Donation operations
4. **hallBookingModel.js** - Hall booking operations
5. **poojaBookingModel.js** - Pooja booking operations
6. **paymentModel.js** - Payment operations

## Views

### Authentication
- `views/auth/login.ejs`
- `views/auth/register.ejs`

### Dashboard
- `views/dashboard/user.ejs`
- `views/dashboard/admin.ejs`

### Donations
- `views/donations/list.ejs`
- `views/donations/new.ejs`

### Bookings
- `views/bookings/hall/list.ejs`
- `views/bookings/hall/new.ejs`
- `views/bookings/pooja/list.ejs`
- `views/bookings/pooja/new.ejs`

### Family
- `views/family/list.ejs` - List all family members
- `views/family/add.ejs` - Add new family member form
- `views/family/edit.ejs` - Edit family member form
- `views/family/view.ejs` - View family member details

### Payment
- `views/payment/success.ejs`
- `views/payment/failure.ejs`

### Errors
- `views/errors/401.ejs`
- `views/errors/403.ejs`
- `views/errors/404.ejs`
- `views/errors/500.ejs`

### Partials
- `views/partials/header.ejs`
- `views/partials/navbar.ejs`
- `views/partials/footer.ejs`

## Integration Status

✅ All controllers created
✅ All routes configured
✅ All views created
✅ All models integrated
✅ Authentication middleware applied
✅ Error handling in place
✅ Payment integration complete

## Testing Checklist

- [ ] Home page loads
- [ ] Login/Register works
- [ ] User dashboard displays
- [ ] Admin dashboard displays (admin only)
- [ ] Donations list and form work
- [ ] Hall bookings list and form work
- [ ] Pooja bookings list and form work
- [ ] Payment integration works
- [ ] Error pages display correctly
- [ ] Navigation works on all pages


