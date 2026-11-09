<div align="center">

# SaudiCord

### عميل ديسكورد مُعدّل بواجهة عربية وتجربة قابلة للتخصيص

**مشروع مستقل مبني على Equicord، المشتق من Vencord.**

[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)

</div>

---

## عن المشروع

SaudiCord هو فرع مستقل يهدف إلى تقديم تجربة ديسكورد عربية، مع دعم اتجاه الكتابة من اليمين إلى اليسار وإضافات قابلة للتخصيص.

المشروع ما زال قيد التطوير. وجود الملفات في المستودع لا يعني أن كل ميزة أو أداة تثبيت جاهزة للاستخدام؛ سيتم توثيق الميزات بعد اختبارها.

## البناء من المصدر

المتطلبات الأساسية:
- Node.js 22 أو أحدث
- pnpm بالإصدار المحدد في package.json
- Git

~~~bash
git clone https://github.com/xxm-cmyk/-SaudiCord-.git
cd -SaudiCord-
pnpm install --frozen-lockfile
pnpm build
~~~

أوامر التطوير والفحص متاحة في package.json. لا تشغّل أوامر الحقن أو الإزالة قبل قراءة تعليماتها وفهم طريقة النسخ الاحتياطي والاستعادة.

## الحقوق والمصادر

SaudiCord مشروع مشتق؛ يحتفظ بإشعارات الحقوق والتراخيص والإسناد للمشاريع والمساهمين الأصليين. راجع:
- NOTICE.md لإشعارات الحقوق والإسناد.
- TRADEMARK.md لسياسة الاسم والعلامة الخاصة بالمشروع الأصلي.
- LICENSE لشروط GPL-3.0-or-later.

المحرك الأساسي مبني على [Equicord](https://github.com/Equicord/Equicord)، المبني بدوره على [Vencord](https://github.com/Vendicated/Vencord).

## تنبيه

SaudiCord تعديل غير رسمي لعميل Discord، وليس تابعًا إلى Discord Inc. تعديلات العميل تتعارض مع شروط خدمة Discord وقد تؤدي إلى إجراءات على الحساب. استخدمه على مسؤوليتك.