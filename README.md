# Ali Electronics - Warehouse Management System

A clean, modern, and minimal warehouse management dashboard designed specifically for day-to-day operations at Ali Electronics.

## Project Structure

- **[index.html](file:///c:/Users/üğıud/OneDrive/Desktop/Ali%20elec%20baza/index.html)**: Layout, forms, and modular sections representing each section of the app.
- **[style.css](file:///c:/Users/üğıud/OneDrive/Desktop/Ali%20elec%20baza/style.css)**: Structured design system centering on a professional dark navy and white theme.
- **[app.js](file:///c:/Users/üğıud/OneDrive/Desktop/Ali%20elec%20baza/app.js)**: State management engine. Features custom data bindings, local storage caching, tab swapping, dynamic dropdown options, and reports calculations.

## Features

1. **Dashboard**: Daily summary cards showing Today's Incoming, Outgoing, and Returned counts, accompanied by a recent activity feed.
2. **Yeni Gələn Mallar (Incoming)**: Simple input form and history log table. Drops down dynamically select models based on the brand choice.
3. **Çıxan Mallar (Outgoing)**: Logs products handed over to technicians (Elçin, Mübariz, Elşad) with customizable sales values.
4. **Qaytarılan Mallar (Returned)**: Track inventory returns by technician.
5. **Ayarlar (Settings & Analytics)**:
   - **Keçmiş (History)**: Instantly filter and audit records by date.
   - **Ayın Sonu (Monthly Report)**: Provides monthly aggregations of quantities, total buying costs, sales revenues, and computed net profit.

## Database Integration Readiness

Currently, state is managed in memory and persists via `localStorage`. For future integration with a real database (e.g., PostgreSQL, MongoDB, or Firebase):
- Replace `localStorage.setItem` and `localStorage.getItem` calls in `app.js` with AJAX/Fetch HTTP requests (e.g., `POST /api/records` and `GET /api/records`).
- Add authentication support to identify user roles.
