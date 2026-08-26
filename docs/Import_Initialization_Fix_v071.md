# Tire Lab v0.7.1 import-initialization repair

v0.7.0 initialized the compound-name editor before the compound physics table was declared. Browser JavaScript therefore raised a temporal-dead-zone ReferenceError and stopped before registering the Physics ZIP and knowledge-import buttons.

v0.7.1 gives the naming UI an independent immutable default-name table. Historical names still override those defaults and generated physics still use the complete compound definition table. No tire coefficients were changed.

Release validation checks JavaScript syntax, PowerShell syntax, dependency order, the two import-handler registrations, version consistency and preservation of the v0.7.0 Validation Workspace.
