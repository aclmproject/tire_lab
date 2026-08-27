# Tire Lab v0.8.1 telemetry live-read repair

v0.8.1 opens logger output with FileShare.ReadWrite. Analyze Latest Log reads a shared byte snapshot and discards any incomplete final row. Analysis is safe while recording, waiting or stopped. No physics or telemetry values changed.
