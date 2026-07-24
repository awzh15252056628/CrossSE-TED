# CrossSE-TED 增强版数据库

主页面：`index.html`

## 本次补充

1. **Coexpression Networks**
   - 保留论文结果摘要：10 个物种、30 个核心 TF、294 个候选基因、357 条关系（291 条正相关、66 条负相关）。
   - 加入可交互的单基因网络查询：读取所选物种完整 FPKM 样本矩阵，按 Pearson `|r| ≥ 0.90`、低表达过滤及明确 NR 注释过滤，显示和导出正/负相关边。
   - 收录论文 Figure 3 的 Liriodendron hybrid 共表达网络图。

2. **Stage Specificity (τ)**
   - 按 Methods 2.1 公式计算 τ，并提供四分类查询：not expressed、weakly expressed、broadly expressed、stage-specific。
   - 可按物种、分类、峰值阶段、基因 ID 和 τ 区间筛选并导出。
   - Liriodendron hybrid 使用完整 35,269 基因 × 11 阶段 FPKM 均值表；收录论文 Figure 2。

3. **Gene Families**
   - 增加 PsbO/OEE1、WOX/WUS、SERK、BBM/AP2、LEC/LAFL、ARF/Aux-IAA、PIN、YUCCA、NAC、MYB、bHLH、WRKY、bZIP、MADS-box 等跨物种家族入口。
   - 内置 7,426 条策展匹配，可跨 10 个物种快速查询并导出。
   - 支持自定义 NR 描述关键词或正则表达式；家族归属为注释快速筛选结果，正式分析仍应以结构域和系统发育验证。

4. **Ka/Ks & Microsynteny**
   - 收录 PsbO/OEE1 Figure 6。
   - 可浏览和导出 62 条有效跨物种 Ka/Ks 结果，并按 Lchi09014 锚定、微共线性支持或主拷贝筛选。
   - 展示 OG0010580、12 个成员、Ka/Ks 中位数 0.0414、范围 0.0170–0.4707 等真实结果。

5. **Figure Gallery**
   - 图库由 27 张扩展到 30 张，补入 Figure 2、Figure 3 和 Figure 6。

## 数据说明

原项目中未找到论文所述 357 条共表达关系的原始边表。因此，本增强版没有伪造该边表：论文统计和 Figure 3 作为已发表/预计算参考结果保留；交互工作台使用数据库随附的完整 FPKM 矩阵和 NR 注释，按页面显示的方法重新计算用户指定基因的网络。

## 打开方式

外置压缩矩阵和结果表需要通过 HTTP 读取。推荐：

- 双击 `start_database.bat`，浏览器会打开数据库；
- 或将整个 `CrossSE-TED_enhanced` 文件夹原样上传到 GitHub Pages / Web 服务器。

不要只复制 HTML；`assets`、`datasets_data` 和 `expression_data` 文件夹需要与 HTML 保持当前相对位置。

## GitHub Pages

此目录已经整理为 GitHub Pages 根目录：

- `index.html` 为网站入口；
- `.nojekyll` 禁用 Jekyll 处理，确保数据与资源按原目录发布；
- `assets`、`datasets_data` 和 `expression_data` 必须一并上传。
