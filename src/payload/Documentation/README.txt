ACLM HISTORICAL TIRE LAB — BROWSER APP BUILD
============================================

This build restores the browser-installed app workflow and keeps the complete v0.3.5/v0.3.6 AC tire-output engine.

INSTALL
-------
1. Extract ACLM_Tire_Lab_Setup.zip.
2. Double-click Install_ACLM_Tire_Lab.cmd.
3. The installer copies the app to %LOCALAPPDATA%\ACLM\Historical Tire Lab.
4. A tiny local-only HTTP server is started on 127.0.0.1:48765 and registered in your Startup folder.
5. Your browser opens Tire Lab at http://127.0.0.1:48765/.
6. Click "Install ACLM Tire Lab" in the header when the browser offers the PWA install prompt.
   Edge fallback: menu (...) > Apps > Install ACLM Historical Tire Lab.

WHY LOCALHOST
-------------
A real installable browser/PWA app needs a secure browser context for the service worker and install prompt. Browsers treat
localhost as secure. This gives Tire Lab the previous browser-app behavior while keeping all files on your PC.
The server listens only on 127.0.0.1; it is not exposed to your network.

RESTORED AC PHYSICS IMPORT
--------------------------
The top panel now accepts:
- a ZIP containing a full AC car, data folder, or loose physics files; or
- an unpacked data/car folder.

The importer reads available car.ini, suspensions.ini, tyres.ini, setup.ini, LUTs and ui_car.json, then populates:
- car/year (when ui_car.json is present)
- total mass
- front static weight from suspensions.ini CG_LOCATION
- front/rear tire width, radius and rim radius
- front/rear RATE and FZ0
- ideal pressure
- blanket temperature and pressure-temperature gain
- existing compound names and matching cold pressures
- extended-physics status
- wheelbase/track and setup-pressure information in the import summary

Imported fields are highlighted green. The imported AC values are inputs; Tire Lab's historical profile/generator can then
override them deliberately rather than losing the original car data.

ZIP LIMITATION
--------------
data.acd itself is packed/encrypted by AC and cannot be decoded by this browser tool. Unpack the data with Content Manager
or import a ZIP/folder containing loose physics files.

OUTPUT ENGINE
-------------
The current generator retains the new complete AC v10 architecture: DY/DX curves, compatibility parameters, FZ0/load
sensitivity, pressure, sidewall/flex, relaxation, finite camber LUTs, thermal/performance LUTs, wear LUTs, wet/intermediate
metadata and pre-export file-reference validation.

Wear remains evidence-driven. Structural validator PASS does not certify historical stint life.
