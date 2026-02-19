# EXP_001: Growing pleurotus. eryngii

**Start Date:** 2026-02-17
**Airtable Links:** MS_S_001

---

Starting from Petri dish culture and liquid culture

from here https://mail.google.com/mail/u/0/?ogbl#search/contact%40lamycosphere.com/FMfcgzQfBkFZTkDNBTslVKTDdxvlpKDx

Grown in PDA + Streptomycin 100uM/ml (final concentration)

## Inoculation Details (Update 2026-02-17)
- Inoculated PDA petri dish with samples from **Mycosphere** liquid culture.
- Inoculated PDA petri dish with samples from **Mycosphere** petri dish plate culture.


## Data Acquisition (ADC-24)
- **Device:** Pico Log ADC-24 (24-bit, USB)
- **Mode:** Differential (E1/E2 → diff, EGND → ground in agar)
- **Voltage range:** ±39 mV (<500 nV resolution)
- **Sampling rate:** 10 S/s (100 ms conversion time)
- **Mains rejection:** 50 Hz
- **Filter:** Savitzky-Golay (3rd order, window 11)
- **Peak detection:** Prominence ≥ 10 µV, noise floor 5 µV
- **Reference:** Mishra et al., Sci. Robot. 2024
- **Dashboard:** `../../applications/adc24-dashboard/` (Next.js + FastAPI)
- **Data files:** `data/session_*.csv`

