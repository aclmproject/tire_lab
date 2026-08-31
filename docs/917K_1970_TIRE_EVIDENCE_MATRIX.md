# Porsche 917K 1970 tire evidence matrix

Status: research constraint set for calibration; not a physics fit.

The central finding is supplier plurality. The 1970 JWAE/Gulf program is strongly associated with Firestone and Porsche Salzburg with Goodyear, but race conditions could trigger switching. Therefore the canonical baseline fixture remains **General / unknown**. A supplier is attached only to a supported team/car/event row.

## Event-by-event result

| Event | Team/car scope | Supported conclusion | Evidence class | Limitation |
|---|---|---|---|---|
| Daytona 24 Hours | JWAE/Gulf | Firestone team architecture; shell-cut LR puncture reported | STRONG_PERIOD_SECONDARY | no pressure, code, or tire-change log |
| Brands Hatch 1000 km | JWAE/Gulf | Firestone wets; 9.5-in F/12-in R wet rims, then intermediates on 10.5/15-in rims | STRONG_PERIOD_SECONDARY | rim width is not tire section width |
| Brands Hatch 1000 km | Salzburg | Goodyear; wets reportedly less effective than Firestone | STRONG_PERIOD_SECONDARY | exact wet code unknown |
| Monza 1000 km | JWAE / Salzburg | Firestone / Goodyear season-team architecture | RECONSTRUCTED | no accepted event sheet |
| Spa 1000 km | JWAE / Salzburg | Firestone / Goodyear season-team architecture; drying-condition wheel changes | RECONSTRUCTED | exact 917 specifications unknown |
| Le Mans 24 Hours | Salzburg 917-023 | Goodyear G2 dry, 10.5x15 F and 15x15 R rims; rain 9x15 F and 15x15 R | STRONG_PERIOD_SECONDARY | later technical reconstruction, no pressure |
| Le Mans 24 Hours | JWAE/Gulf | Firestone team architecture | STRONG_PERIOD_SECONDARY | exact per-car compound/rim unknown |
| Watkins Glen 6 Hours | JWAE / Salzburg | Firestone / Goodyear season-team architecture | RECONSTRUCTED | no accepted event sheet |
| Nürburgring 1000 km | Salzburg program | practiced Goodyear, switched to Firestone for conditions | STRONG_PERIOD_SECONDARY | works raced 908/3, so this proves flexibility—not a 917K specification |

## Category matrix

| Category | Classification | Accepted value | Limitation |
|---|---|---|---|
| identity | DIRECT_PRIMARY | Porsche 917, FIA homologation 250; 1970 917K host | — |
| class | GENERATOR_PRIOR | CLS035 | ACLM taxonomy |
| family | GENERATOR_PRIOR | FAM035 | ACLM taxonomy |
| construction | RECONSTRUCTED | period bias/cross-ply architecture | reviewed material does not expose casing angles/material for each event |
| supplier | STRONG_PERIOD_SECONDARY | team/event-specific Firestone or Goodyear | no universal 917K supplier |
| front geometry | STRONG_PERIOD_SECONDARY + control | Le Mans dry rim 10.5x15; Kunos 0.230 m width/0.3048 m radius | Kunos is implementation control only |
| rear geometry | STRONG_PERIOD_SECONDARY + control | Le Mans dry rim 15x15; Kunos 0.370 m width/0.3302 m radius | Kunos is implementation control only |
| rim dimensions | STRONG_PERIOD_SECONDARY | 15-in diameter; condition-dependent widths | tire section still unresolved |
| pressure | UNKNOWN | null | Kunos 24/29 static and 32/38 ideal are not period proof |
| loaded radius | UNKNOWN | null | — |
| vertical rate | GENERATOR_PRIOR | Kunos 347350 F / 382350 R N/m control | not a historical measurement |
| temperature | UNKNOWN | null | no observable-specific temperature found |
| compound | STRONG_PERIOD_SECONDARY | Goodyear G2 dry for Le Mans 917-023 only | other codes unresolved |
| qualifying tire | UNKNOWN | null | — |
| race tire | STRONG_PERIOD_SECONDARY | baseline dry endurance/race architecture | exact code usually unknown |
| wet tire | STRONG_PERIOD_SECONDARY | Firestone wet at Brands; Goodyear rain at Le Mans | event-specific |
| intermediate tire | STRONG_PERIOD_SECONDARY | JWAE intermediate at Brands | exact code unknown |
| high-speed growth | UNKNOWN | null | hazard evidence does not quantify growth |
| stint life | UNKNOWN | null | race distance is not tire-set life |
| failure behavior | STRONG_PERIOD_SECONDARY | puncture/deflation and tread-separation hazards | event-specific mechanisms |
| heat cycle | UNKNOWN | null | — |
| scrub state | UNKNOWN | null | — |
| wear behavior | UNKNOWN | null | no wear curve/depth/set-life evidence |

## Sources and review status

The machine-readable companion contains full source metadata and exact applicability. Key reviewed sources are the [FIA homologation record](https://historicdb.fia.com/node/99501), period Motor Sport reports for [Daytona](https://www.motorsportmagazine.com/archive/article/march-1970/29/the-24-hours-of-daytona-2/), [Brands Hatch](https://www.motorsportmagazine.com/archive/article/may-1970/36/boac-1000-km-race/), [Spa](https://www.motorsportmagazine.com/archive/article/june-1970/22/the-1000-kms-of-francorchamps/), [Nürburgring](https://www.motorsportmagazine.com/archive/article/july-1970/54/the-adac-1000-kilometers/), and [Le Mans](https://www.motorsportmagazine.com/archive/article/july-1970/22/le-mans-1970-a-dead-loss/), plus the [IMRRC Brands reconstruction](https://www.racingarchives.org/blogpost/brands-hatch-1970-pedros-greatest-drive/) and Porsche historical material.

Decision: generate one baseline dry endurance fixture with supplier **General / unknown**. No thermal, pressure, rate, flex, wear, or Knowledge numeric prior is changed by this evidence pass.
