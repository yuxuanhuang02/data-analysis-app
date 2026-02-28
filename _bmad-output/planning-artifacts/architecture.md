---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/product-brief-data-analysis-app-2026-02-27.md']
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-27'
project_name: 'data-analysis-app'
user_name: '濮掓稑瀚�悾銈嗘姜閿燂拷'
date: '2026-02-27'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._
 
## Project Context Analysis 
 
### Requirements Overview 
 
**Functional Requirements:** 
閺嶇ǹ绺鹃懗钘夊�闂嗗棔鑵戦崷銊ョ磽閺嬪嫭鈧�崵鍤庨柅鏄忕帆閺佺増宓� (.blf) 娑撳海澧块悶鍡曠炊閹扮喎娅掗弫鐗堝祦 (.csv/.excel) 閻ㄥ嫮鏁撻崨钘夋噯閺堢喓锟介悶鍡愨偓鍌涚仸閺嬪嫬绻€妞ょ粯鏁�幐渚婄窗 
- 閺嬩礁鍙炬�妯绘櫏閻ㄥ嫪绨╂潻娑樺煑娑撳孩鏋冮張锟叫掗弸鎰�拷闁�挶鈧�拷 
- **VCTM 閺勭姴鐨犵仦锟�**閿涙矮缍旀稉鐑樺�閺堝�褰茬憴鍡楀�閸滃本绁撮柌蹇旀惙娴ｆ粎娈�" "閸楁洑绔撮惇鐔封偓鍏肩爱閵嗭拷 
- 鐎圭偞妞傞崡蹇庣稊閺嶅洦鏁炴稉搴ょ槑鐠佺儤绁﹂妴锟� 
 
**Non-Functional Requirements:** 
- **閺嬩胶锟介幀褑鍏橀崢瀣��**閿涳拷10GB 閺傚洣娆㈤惃鍕�拷缁狙冩惙鎼存棁锟藉Ч鍌氬�缁旓拷鐏﹂弸鍕�徔婢跺洨绨跨€靛棛娈戦崘鍛�摠缁狅紕鎮婃稉搴″瀻閻楀洤濮炴潪鍊熷厴閸旀稏鈧�拷 
- **妤傛ê褰查悽銊ょ�閼峰瓨鈧�拷**閿涙俺娉曢弮璺哄隘閻ㄥ嫬鐤勯弮鑸电垼濞夈劌鎮撳�銉ｂ偓锟� 
 
**Scale & Complexity:** 
閺堬拷銆嶉惄锟斤拷閺夊倸瀹崇€规矮绠熸稉锟� **High**閵嗗倽娅ч悞鑸电梾閺堝�鈥栨禒鏈电贩鐠ф牭绱濇担鍡楀従閺佺増宓佹径鍕�倞濞ｅ崬瀹抽敍鍫濅簳缁夋帞楠囬敍澶夌瑢 Web 缁旓拷鐤勯弮鑸佃�閺屾捁鍏橀崝娑氭畱閸愯尙鐛婄敮锔芥降娴滃棙鐎��妯兼畱瀵�偓閸欐垶瀵�幋妯糕偓锟� 
 
- Primary domain: High-Performance Data Analysis Web App 
- Complexity level: High 
- Estimated architectural components: 6-8 (Parser Workers, VCTM Engine, LOD Renderer, Collaboration Hub, etc.) 
 
### Technical Constraints & Dependencies 
- **缁撅拷钂嬫禒鑸电仸閺嬶拷**閿涙碍甯撻梽銈勬崲娴ｏ拷 USB-CAN 閸椻剝鍨ㄦ导鐘冲妳閸ｃ劎鈥栨禒鍫曗攳閸斻劋绶风挧鏍モ偓锟� 
- **濞村繗锟介崳銊︾煓閻╂帡妾洪崚锟�**閿涙艾褰堥梽鎰�艾濞村繗锟介崳銊ュ敶鐎涙﹢妾洪崚璁圭礉閺嶇ǹ绺剧憴锝嗙€借箛鍛淬€忔稉瀣�焽閸掓壆瀚�粩瀣�殠缁嬪�鈧�拷 
- **閺佺増宓侀弽鐓庣础缁撅附娼�**閿涙艾甯�悽鐔告暜閹革拷 BLF, CSV, Excel閿涙稐绗夐弨锟藉瘮鐎圭偞妞傞幀鑽ゅ殠濞翠浇绶�崗銉ｂ偓锟� 
 
### Cross-Cutting Concerns Identified 
- **閸忋劌鐪�悩鑸碘偓浣革拷姒伙拷**閿涙艾锟芥担鏇犫€樻穱婵嗗瀻鐢�啫绱￠弽鍥ㄦ暈閸︺劋绗夐崥宀€缍夌紒婊冩�鏉╃喍绗呮笟婵堝姧閼崇晫绨块崙鍡楋拷姒绘劕鍩屽�锟斤拷缁狙勫皾瑜扳偓鈧�拷 
 
## Starter Template Evaluation 
 
### Primary Technology Domain 
 
High-Performance Web Application (Data Intensive) based on project requirements analysis. 
 
### Selected Starter: Next.js 15+ Advanced Dashboard Framework 
 
**Rationale for Selection:** 
Next.js 15 provides Server Components (RSC) and Streaming capabilities essential for handling 10GB+ data files without blocking the UI thread. Native support for WASM (via Rust) and Web Workers allows offloading heavy BLF parsing logic. 
 
**Initialization Command:** 
 
`ash 
npx create-next-app@latest data-analysis-app --typescript --tailwind --eslint --app 
` 
 
**Architectural Decisions Provided by Starter:** 
- **Language**: TypeScript (Strict mode). 
- **Styling**: Tailwind CSS for high-performance utility-first styling. 
- **State Management**: Zustand (recommended) for lightweight global state. 
 
## Core Architectural Decisions 
 
### Data Architecture 
 
- **瑙ｆ瀽閫昏緫**: BLF 浜岃繘鍒惰В鏋愮敱浜庢€ц兘鏁忔劅锛岄噰鐢� **Rust (WASM)** 瀹炵幇锛汣SV/Excel 閲囩敤 **JS Streams**銆� 
- **瀹㈡埛绔�寔涔呭寲**: 浣跨敤 **IndexedDB** 缂撳瓨 VCTM 绱㈠紩鏁版嵁锛屽疄鐜� 10GB 绾уぇ鏂囦欢鐨勫揩閫熶簩娆″姞杞姐€� 
- **Rationale**: 娴忚�鍣ㄥ唴瀛樻湁闄愶紝蹇呴』閫氳繃 WASM 姒ㄥ共绠楀姏骞跺缓绔嬭櫄鎷熺�鐩樼紦瀛樻満鍒躲€� 
 
### Frontend & Rendering 
 
- **鐘舵€佺�鐞�**: **Zustand**锛岃礋璐ｇ�鐞� VCTM 鍏ㄥ眬鏃堕棿鍋忕Щ銆佷俊鍙峰紑鍏冲強鍗忎綔鏍囨敞鐘舵€併€� 
- **娓叉煋寮曟搸**: **Layered Renderer**銆傚簳灞傛尝褰㈠熀浜� **WebGL (PixiJS)** 娓叉煋锛岄《灞備氦浜掓爣灏洪噰鐢� HTML5 Canvas銆� 
- **骞惰�鍖�**: 瑙ｆ瀽寮曟搸涓庡�榻愰€昏緫鍏ㄩ儴杩愯�鍦ㄧ嫭绔� **Web Workers** 涓�紝涓荤嚎绋嬩笓娉ㄤ簬 60FPS 鐨勬覆鏌撲笌浜や簰銆� 
 
### Collaboration & Communication 
 
- **鍚屾�鏈哄埗**: 鍩轰簬 **WebSocket (Socket.io)** 瀹炴椂鍒嗗彂鏍囨敞銆佽瘎璁哄強瀵归綈鍙傛暟銆� 
 
## Implementation Patterns & Consistency Rules 
 
### Naming Patterns 
 
- **Code**: TypeScript + camelCase (variables/funcs), PascalCase (components). 
- **Files**: Components as PascalCase.tsx, utils as kebab-case.ts. 
- **Data**: Raw signal signal names (e.g. ENGINE_SPEED) are preserved in VCTM but formatted in UI. 
 
### Key Architecture Patterns 
 
- **State**: **Zustand Feature-based Slices**. Separates heavy VCTM data from lightweight UI state. 
- **Workers**: **Comlink abstraction**. All Parser and Alignment logic MUST run in Workers. 
- **Rendering**: **Layered Renderer**. WebGL (PixiJS) for waveforms + Canvas for overlays. 
 
### Enforcement Guidelines 
- All heavy data processing ( MUST be offloaded to Web Workers. 
 
## Project Structure & Boundaries 
 
### Complete Project Directory Structure 
 
`yaml 
data-analysis-app/ 
├── src/ 
│   ├── app/                      # Next.js App Router (路由) 
│   ├── components/ 
│   │   ├── analysis/             # 测量工具、树状信号列表 
│   │   └── renderer/             # WebGL (PixiJS) 渲染内核 
│   ├── lib/ 
│   │   ├── vctm/                 # 虚拟连续时间模型核心 
│   │   ├── workers/              # Web Workers (Comlink) 
│   │   └── storage/              # IndexedDB 数据层 
│   └── store/                    # Zustand (vctmSlice, uiSlice) 
├── wasm-parser/                  # Rust 源码 (BLF 解析引擎) 
└── tests/                        # Playwright E2E & Unit Tests 
` 
 
### Architectural Boundaries 
 
1. **解析边界 (Parser Boundary)**: wasm-parser 模块只负责将二进制 BLF 转为 VCTM 兼容映射，不感知 UI 状态。 
2. **渲染边界 (Renderer Boundary)**: renderer 组件只消费 lib/vctm 提供的插值点位数据，不进行原始采样计算。 
 
## Architecture Validation Results 
 
### Coherence Validation | || 
 
- **Decision Compatibility**: Next.js 15 Streaming + Rust/WASM parsing perfectly optimized for 10GB binary data handling. 
- **Pattern Consistency**: Comlink abstraction ensures unified Worker communication across all analysis modules. 
 
### Requirements Coverage | || 
 
- **Performance (NFR)**: WebGL (PixiJS) renderer meets the 50+ FPS target for millions of data points. 
- **Data Integrity**: VCTM microsecond precision mapping is centrally handled in a dedicated library layer. 
- **Real-time Sync**: Socket.io + Zustand slices provide zero-conflict collaborative state. 
 
### Architecture Readiness Assessment 
 
**Overall Status**: READY FOR IMPLEMENTATION 
**Confidence Level**: High 
 
