### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

# v0.6.1

## Fixes
- AOI Patch BugFix [`#548`](https://github.com/developmentseed/lulc-infra/pull/548)
- Change default Auth0 tenant endpoint [`#546`](https://github.com/developmentseed/lulc-infra/pull/546)
- remove old azure docs. update deployment docs with new terraform setup [`#544`](https://github.com/developmentseed/lulc-infra/pull/544)

## Improvements

- add helm resource for grafana + loki stack for logging [`#521`](https://github.com/developmentseed/lulc-infra/pull/521)
- Model Retraining Improvements [`#541`](https://github.com/developmentseed/lulc-infra/pull/541)

# v0.6.0

## Fixes
- Fix PX_Stats [`#517`](https://github.com/developmentseed/lulc-infra/pull/517)
- Small fix to patch list [`#515`](https://github.com/developmentseed/lulc-infra/pull/515)
- Use base url from flight.request and fix type in docstrings [`#510`](https://github.com/developmentseed/lulc-infra/pull/510)
- set max body size on API ingress to 300mb, refs #511 [`#513`](https://github.com/developmentseed/lulc-infra/pull/513)
- Use 403 error instead of 401 when the user doesn't fit the permission [`#507`](https://github.com/developmentseed/lulc-infra/pull/507)
- Fix permissions in /share/:shareuuid/download/* endpoints [`#505`](https://github.com/developmentseed/lulc-infra/pull/505)
- start count at 1 instead of 0 [`#482`](https://github.com/developmentseed/lulc-infra/pull/482)

## Features
- Additional Model Architecture Support [`#519`](https://github.com/developmentseed/lulc-infra/pull/519)
- Terraform [`#447`](https://github.com/developmentseed/lulc-infra/pull/447)
- Support UNET Architecture models  [`#487`](https://github.com/developmentseed/lulc-infra/pull/487)
## Improvements

- Objectify CheckPoint Class [`#518`](https://github.com/developmentseed/lulc-infra/pull/518)
- Objectify Instance Class [`#516`](https://github.com/developmentseed/lulc-infra/pull/516)
- Objectification of Model Class [`#509`](https://github.com/developmentseed/lulc-infra/pull/509)
- Standard Azure Blob Storage [`#508`](https://github.com/developmentseed/lulc-infra/pull/508)
- AOI  [`#502`](https://github.com/developmentseed/lulc-infra/pull/502)
- Ingress nginx [`#503`](https://github.com/developmentseed/lulc-infra/pull/503)
- Remove model#abort [`#501`](https://github.com/developmentseed/lulc-infra/pull/501)
- Add bookmarked_at field to AOI [`#496`](https://github.com/developmentseed/lulc-infra/pull/496)
- Add Share Downloads [`#500`](https://github.com/developmentseed/lulc-infra/pull/500)
- Fix Res Error [`#499`](https://github.com/developmentseed/lulc-infra/pull/499)
- Update API documentation [`#498`](https://github.com/developmentseed/lulc-infra/pull/498)
- Return 0 when there isn't active gpus running [`#497`](https://github.com/developmentseed/lulc-infra/pull/497)
- give 10 gpus for staging [`#494`](https://github.com/developmentseed/lulc-infra/pull/494)
- Global Retrain Test [`#488`](https://github.com/developmentseed/lulc-infra/pull/488)
- Global Tests [`#481`](https://github.com/developmentseed/lulc-infra/pull/481)
- switch to pytorch 1.9 + cuda 11.1 [`#415`](https://github.com/developmentseed/lulc-infra/pull/415)
- Lock ws to v7 [`#480`](https://github.com/developmentseed/lulc-infra/pull/480)
- Batch Error [`#479`](https://github.com/developmentseed/lulc-infra/pull/479)
- Reduce Progress Updates [`#478`](https://github.com/developmentseed/lulc-infra/pull/478)
- Lint All The Things [`#477`](https://github.com/developmentseed/lulc-infra/pull/477)
- Lint Python [`#476`](https://github.com/developmentseed/lulc-infra/pull/476)

# v0.5.0

## Fixes
- fix incorrect coalesce for active.false condition [`#463`](https://github.com/developmentseed/lulc-infra/pull/463)
- Terminate after batch [`#460`](https://github.com/developmentseed/lulc-infra/pull/460)
- Checkpoint Bug [`#454`](https://github.com/developmentseed/lulc-infra/pull/454)

## Features
- Batch Worker [`#455`](https://github.com/developmentseed/lulc-infra/pull/455)
- Batch Progress [`#452`](https://github.com/developmentseed/lulc-infra/pull/452)
- Batch Class [`#450`](https://github.com/developmentseed/lulc-infra/pull/450)
- Instance Batch Mode [`#448`](https://github.com/developmentseed/lulc-infra/pull/448)

## Improvements
- Refactor Project Class [`#459`](https://github.com/developmentseed/lulc-infra/pull/459)
- Routify Remaining Routes [`#457`](https://github.com/developmentseed/lulc-infra/pull/457)
- make max inference 200km2 [`#458`](https://github.com/developmentseed/lulc-infra/pull/458)
- Node-PG =&gt; Slonik [`#449`](https://github.com/developmentseed/lulc-infra/pull/449)
- Never delete [`#444`](https://github.com/developmentseed/lulc-infra/pull/444)
- Dynamic Route Loading [`#414`](https://github.com/developmentseed/lulc-infra/pull/414)

# v0.4.1

## Fixes
- set aoi maxzoom to 20 [`#439`](https://github.com/developmentseed/lulc-infra/pull/439)
- Add url_params & check aoi existance [`#437`](https://github.com/developmentseed/lulc-infra/pull/437)
- sometimes stats aren't what's expected [`#431`](https://github.com/developmentseed/lulc-infra/pull/431)

## v0.4.0

## Fixes
- Standard Dependency Maintenance [`#413`](https://github.com/developmentseed/lulc-infra/pull/413)
- Retrain Fix  [`#416`](https://github.com/developmentseed/lulc-infra/pull/416)
- Embedding Fix [`#418`](https://github.com/developmentseed/lulc-infra/pull/418)
- Ensure px stats exist before using [`#423`](https://github.com/developmentseed/lulc-infra/pull/423)
- Use categorical endpoint [`#429`](https://github.com/developmentseed/lulc-infra/pull/429)
- add statistics endpoint [`#428`](https://github.com/developmentseed/lulc-infra/pull/428)
- Use sum of histo instead of px x,y [`#427`](https://github.com/developmentseed/lulc-infra/pull/427)

## Features
- AOI Stats [`#412`](https://github.com/developmentseed/lulc-infra/pull/412)
- Support retrain samples as feature collection [`#411`](https://github.com/developmentseed/lulc-infra/pull/411)

## Improvements
- Pre-Commit + Linting  [`#398`](https://github.com/developmentseed/lulc-infra/pull/398)
- retrain metrics improvements  [`#403`](https://github.com/developmentseed/lulc-infra/pull/403)
- k8s upgrade 1.9 [`#417`](https://github.com/developmentseed/lulc-infra/pull/417)
- Filter by AOI [`#424`](https://github.com/developmentseed/lulc-infra/pull/424)
- create nginx container to redirect to www [`#419`](https://github.com/developmentseed/lulc-infra/pull/419)
- Persist user submitted retrain samples [`#422`](https://github.com/developmentseed/lulc-infra/pull/422)

## v0.3.0

## Fixes
- Retrain Geom Fix  [`#386`](https://github.com/developmentseed/lulc-infra/pull/386)
- gpu shared volume memory [`#367`](https://github.com/developmentseed/lulc-infra/pull/367)
- make tile caching longer and remove debug for production [`#376`](https://github.com/developmentseed/lulc-infra/pull/376)

## v0.2.0

## Features
- Remove colormap that isn't needed for pre-colored Tiffs [`#371`](https://github.com/developmentseed/lulc-infra/pull/371)
- AOI Share [`#348`](https://github.com/developmentseed/lulc-infra/pull/348)
- Shares List [`#361`](https://github.com/developmentseed/lulc-infra/pull/361)
- Batch inference [`#346`](https://github.com/developmentseed/lulc-infra/pull/346)
- AOI Loading [`#328`](https://github.com/developmentseed/lulc-infra/pull/328)
- Abort Retrain [`#333`](https://github.com/developmentseed/lulc-infra/pull/333)

## Improvements
- Retrain Improvements: Decrease point sample from polygon [`#357`](https://github.com/developmentseed/lulc-infra/pull/357)
- less memory intensive retrain [`#364`](https://github.com/developmentseed/lulc-infra/pull/364)
- update TiTiler version to 0.3.1 [`#351`](https://github.com/developmentseed/lulc-infra/pull/351)
- Add the ability to load AOIs [`#345`](https://github.com/developmentseed/lulc-infra/pull/345)
- return gpu availability with the config endpoint [`#342`](https://github.com/developmentseed/lulc-infra/pull/342)
- make 15 gpus before using cpus on staging for testing [`#332`](https://github.com/developmentseed/lulc-infra/pull/332)
- Use big placeholders  [`#331`](https://github.com/developmentseed/lulc-infra/pull/331)
- Nodeselectors + TTL updates [`#325`](https://github.com/developmentseed/lulc-infra/pull/325)
## Fixes
- Fix Class Brush [`#365`](https://github.com/developmentseed/lulc-infra/pull/365)
- Fix share call [`#362`](https://github.com/developmentseed/lulc-infra/pull/362)
- Actually generate aoi share tile url [`#366`](https://github.com/developmentseed/lulc-infra/pull/366)
- checkpoint edge case fix [`#350`](https://github.com/developmentseed/lulc-infra/pull/350)
- Model Prediction Count up not down [`#356`](https://github.com/developmentseed/lulc-infra/pull/356)
- remove duplicate getPodStatus method [`#353`](https://github.com/developmentseed/lulc-infra/pull/353)
- dont make username a primary key [`#341`](https://github.com/developmentseed/lulc-infra/pull/341)
- import mapping from shapely. possible merge conflict bug [`#336`](https://github.com/developmentseed/lulc-infra/pull/336)
- Instance#Terminate [`#334`](https://github.com/developmentseed/lulc-infra/pull/334)

## v0.1.0

### Features
- k8s instance state [`#326`](https://github.com/developmentseed/lulc-infra/pull/326)
- Ping Pong [`#319`](https://github.com/developmentseed/lulc-infra/pull/319)
- Fallback CPUs [`#305`](https://github.com/developmentseed/lulc-infra/pull/305)
- sort and filter [`#290`](https://github.com/developmentseed/lulc-infra/pull/290)
- Share aois [`#281`](https://github.com/developmentseed/lulc-infra/pull/281)
- Cogify [`#285`](https://github.com/developmentseed/lulc-infra/pull/285)
- AOI Patch Tiles [`#287`](https://github.com/developmentseed/lulc-infra/pull/287)
- Patch List in AOI API [`#286`](https://github.com/developmentseed/lulc-infra/pull/286)
- Class Brush [`#282`](https://github.com/developmentseed/lulc-infra/pull/282)
- Clip Predictions  [`#257`](https://github.com/developmentseed/lulc-infra/pull/257)
- Debug & Abort [`#283`](https://github.com/developmentseed/lulc-infra/pull/283)
- Add brush API [`#262`](https://github.com/developmentseed/lulc-infra/pull/262)
- AOI Patch API [`#256`](https://github.com/developmentseed/lulc-infra/pull/256)
- Tiff Colour [`#255`](https://github.com/developmentseed/lulc-infra/pull/255)
- Abort & Status [`#251`](https://github.com/developmentseed/lulc-infra/pull/251)
- Thread Spawn [`#250`](https://github.com/developmentseed/lulc-infra/pull/250)
- Parent ID [`#249`](https://github.com/developmentseed/lulc-infra/pull/249)
- Retrain + Checkpoint polygons [`#245`](https://github.com/developmentseed/lulc-infra/pull/245)
- Bookmark AOIs [`#238`](https://github.com/developmentseed/lulc-infra/pull/238)
- Dynamic Chkpt Loading [`#232`](https://github.com/developmentseed/lulc-infra/pull/232)
- access seed data for retraining [`#213`](https://github.com/developmentseed/lulc-infra/pull/213)
- Delete Instance [`#226`](https://github.com/developmentseed/lulc-infra/pull/226)
- AOI Delete [`#221`](https://github.com/developmentseed/lulc-infra/pull/221)
- Delete project [`#216`](https://github.com/developmentseed/lulc-infra/pull/216)
- AOI ColourMap [`#212`](https://github.com/developmentseed/lulc-infra/pull/212)
- Seed Data [`#210`](https://github.com/developmentseed/lulc-infra/pull/210)
- Checkpoint Metrics [`#146`](https://github.com/developmentseed/lulc-infra/pull/146)
- Terminate GPU pods [`#129`](https://github.com/developmentseed/lulc-infra/pull/129)
- AOI TileJSON [`#101`](https://github.com/developmentseed/lulc-infra/pull/101)
- Kube Config [`#113`](https://github.com/developmentseed/lulc-infra/pull/113)
- Checkpoint Class Patch [`#99`](https://github.com/developmentseed/lulc-infra/pull/99)
- Checkpoint Bookmarks [`#98`](https://github.com/developmentseed/lulc-infra/pull/98)
- Retraining & Checkpoints [`#91`](https://github.com/developmentseed/lulc-infra/pull/91)
- Add Knex for database migrations [`#93`](https://github.com/developmentseed/lulc-infra/pull/93)
- AOI Name & Checkpoint ID [`#97`](https://github.com/developmentseed/lulc-infra/pull/97)
- Project Tests [`#96`](https://github.com/developmentseed/lulc-infra/pull/96)
- create GPU pods [`#70`](https://github.com/developmentseed/lulc-infra/pull/70)
- Instance Timeout [`#84`](https://github.com/developmentseed/lulc-infra/pull/84)
- Tiler Scaling [`#81`](https://github.com/developmentseed/lulc-infra/pull/81)
- Future Models [`#76`](https://github.com/developmentseed/lulc-infra/pull/76)
- Projects [`#74`](https://github.com/developmentseed/lulc-infra/pull/74)
- CheckPoints [`#66`](https://github.com/developmentseed/lulc-infra/pull/66)
- SSL Setup with Lets Encrypt [`#62`](https://github.com/developmentseed/lulc-infra/pull/62)
- AOI Simplify [`#65`](https://github.com/developmentseed/lulc-infra/pull/65)
- Model APIs [`#63`](https://github.com/developmentseed/lulc-infra/pull/63)
- Ingress + App Gateway + Metrics [`#43`](https://github.com/developmentseed/lulc-infra/pull/43)
- PNG Inference [`#55`](https://github.com/developmentseed/lulc-infra/pull/55)
- Project [`#54`](https://github.com/developmentseed/lulc-infra/pull/54)
- Enable Auth0 [`#38`](https://github.com/developmentseed/lulc-infra/pull/38)
- Staging & test deploys [`#51`](https://github.com/developmentseed/lulc-infra/pull/51)
- add COG endpoints [`#50`](https://github.com/developmentseed/lulc-infra/pull/50)
- k8s api [`#26`](https://github.com/developmentseed/lulc-infra/pull/26)
- Auth0 Main [`#44`](https://github.com/developmentseed/lulc-infra/pull/44)
- Prediction MVP [`#40`](https://github.com/developmentseed/lulc-infra/pull/40)
- Model Server [`#37`](https://github.com/developmentseed/lulc-infra/pull/37)
- Router [`#34`](https://github.com/developmentseed/lulc-infra/pull/34)
- Shoe in Machine [`#28`](https://github.com/developmentseed/lulc-infra/pull/28)
- Get model API [`#20`](https://github.com/developmentseed/lulc-infra/pull/20)
- Enable CORS [`#25`](https://github.com/developmentseed/lulc-infra/pull/25)
- Class Brush Scoping [`86fb6c7`](https://github.com/developmentseed/lulc-infra/commit/86fb6c7ecb0991a87831f62643333c167b54de12)
