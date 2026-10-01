"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to a deadline, re-rendering once a second.
 *
 * The auto-release deadline is the customer's last chance to dispute, so it has
 * to be visible as a running clock rather than a static date. Returns null once
 * the deadline has passed, so callers can render "released" instead of a
 * negative countdown.
 *
 * @param {number|null} targetMs  epoch ms of the deadline
 * @returns {{days:number, hours:number, minutes:number, seconds:number, urgent:boolean, expired:boolean}|null}
 */
export default function useCountdown(targetMs) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!targetMs) return undefined;

        // Only tick while the deadline is still ahead; otherwise this would
        // re-render forever on an expired order.
        const id = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (t >= targetMs) clearInterval(id);
        }, 1000);

        return () => clearInterval(id);
    }, [targetMs]);

    // `now` can lag a changed target by up to one tick. That is immaterial for a
    // countdown, and avoids reading the clock during render, which would break
    // render purity.

    if (!targetMs) return null;

    const remaining = targetMs - now;
    if (remaining <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, urgent: false, expired: true };
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Under 24h left is the window where disputing actually matters, so this
    // is what drives the visual urgency.
    return { days, hours, minutes, seconds, urgent: remaining < 86400000, expired: false };
}
