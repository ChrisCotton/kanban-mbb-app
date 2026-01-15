# MBB Analytics API

## Overview
The MBB Analytics API provides aggregated time tracking and earnings data for the Mental Bank Balance dashboard.

## Endpoint

```
GET /api/mbb/analytics
```

## Request Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| user_id   | string | Yes      | The user's UUID |
| filter    | string | No       | Filter type (default: 'all') |

## Response Schema

```json
{
  "success": true,
  "data": {
    "today_earnings": 150.00,
    "today_hours": 1.5,
    "week_earnings": 750.00,
    "week_hours": 7.5,
    "month_earnings": 3200.00,
    "month_hours": 32.0,
    "total_earnings": 15000.00,
    "total_hours": 150.0,
    "average_hourly_rate": 100.00,
    "target_balance": 1000.00,
    "sessions_count": {
      "today": 2,
      "week": 10,
      "month": 45,
      "total": 200
    }
  },
  "period": {
    "today_start": "2026-01-15T00:00:00.000Z",
    "week_start": "2026-01-13T00:00:00.000Z",
    "month_start": "2026-01-01T00:00:00.000Z",
    "now": "2026-01-15T14:30:00.000Z"
  }
}
```

## Response Fields

### Earnings Fields
| Field | Type | Description |
|-------|------|-------------|
| today_earnings | number | Total USD earned today |
| week_earnings | number | Total USD earned this week (Mon-Sun) |
| month_earnings | number | Total USD earned this calendar month |
| total_earnings | number | Total USD earned all time |

### Hours Fields
| Field | Type | Description |
|-------|------|-------------|
| today_hours | number | Total hours worked today |
| week_hours | number | Total hours worked this week |
| month_hours | number | Total hours worked this month |
| total_hours | number | Total hours worked all time |

### Calculated Fields
| Field | Type | Description |
|-------|------|-------------|
| average_hourly_rate | number | Weighted average hourly rate (total_earnings / total_hours) |
| target_balance | number | User's target balance goal (default: 1000) |

### Session Counts
| Field | Type | Description |
|-------|------|-------------|
| sessions_count.today | number | Number of completed sessions today |
| sessions_count.week | number | Number of completed sessions this week |
| sessions_count.month | number | Number of completed sessions this month |
| sessions_count.total | number | Total completed sessions all time |

## Period Calculations

### Today
- Starts at midnight UTC (00:00:00.000Z)
- Ends at current time

### This Week
- Starts on Monday at midnight UTC
- Ends at current time
- Uses ISO week definition (Monday = start of week)

### This Month
- Starts on the 1st of the current month at midnight UTC
- Ends at current time

## Error Responses

### 400 Bad Request
```json
{
  "error": "user_id is required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch analytics data",
  "details": "Database connection timeout" // Only in development
}
```

## Example Request

```bash
curl -X GET "https://your-app.com/api/mbb/analytics?user_id=123e4567-e89b-12d3-a456-426614174000"
```

## Example Response

```json
{
  "success": true,
  "data": {
    "today_earnings": 75.50,
    "today_hours": 0.5,
    "week_earnings": 450.00,
    "week_hours": 3.0,
    "month_earnings": 1200.00,
    "month_hours": 8.0,
    "total_earnings": 5600.00,
    "total_hours": 37.33,
    "average_hourly_rate": 150.00,
    "target_balance": 1000.00,
    "sessions_count": {
      "today": 1,
      "week": 5,
      "month": 12,
      "total": 75
    }
  },
  "period": {
    "today_start": "2026-01-15T00:00:00.000Z",
    "week_start": "2026-01-13T00:00:00.000Z",
    "month_start": "2026-01-01T00:00:00.000Z",
    "now": "2026-01-15T10:30:00.000Z"
  }
}
```

## Notes

1. **Active Sessions Excluded**: Only completed sessions (with `ended_at` set) are included in analytics
2. **Rounding**: All monetary values are rounded to 2 decimal places
3. **Hours**: Hours are calculated from `duration_seconds / 3600`
4. **Earnings Source**: Earnings come from the `earnings_usd` column in `time_sessions` table
5. **Timezone**: All period boundaries are calculated in UTC

## Related Endpoints

- `GET /api/time-sessions` - List individual time sessions
- `POST /api/time-sessions` - Start a new time session
- `PUT /api/time-sessions/[id]` - Update/stop a time session
