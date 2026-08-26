Mathreya Project Context

1. Project Identity

Project: Mathreya
Tagline: The Care That Feels Like Home
Type: Mobile-first women's healthcare and wellness platform
Primary goal: Provide a private, empathetic, culturally familiar digital care space for women across important life stages.

Mathreya currently covers:

Puberty & adolescent care

Pregnancy care: prenatal and postnatal

Partner/Husband care

Virtual Amma AI

Profile, privacy, emergency and security features

Dashboard/life-stage navigation

New required life stage

Menopause & Midlife Care must be added as a real, working life-stage module. It must NOT remain a "Coming Soon" card.

The menopause module should follow the same product philosophy as the existing Puberty and Pregnancy modules:

educational guidance

symptom/body awareness

self-care and routines

AI guidance where appropriate

community

doctor/consultation discovery

media/resources

private/safe space where relevant

culturally familiar Indian wellness presentation

clear medical safety boundaries

2. Existing Tech Stack

Frontend

React

TypeScript

Vite

Tailwind CSS

Motion (motion/react)

Lucide React icons

Backend

Node.js

Express

TypeScript

Gemini API via @google/genai

AI

Backend endpoint:
POST /api/ai/chat

Request shape currently uses:

prompt

persona

optional userContext

Existing personas include:

virtual_mom

ai_psychiatrist

puberty_assistant

A menopause persona can be added when the menopause AI assistant is implemented.

Existing app characteristics

Mobile-first responsive UI

Warm Indian/traditional visual language

Rosewood/brown/terracotta/cream palette

Rounded cards

Soft borders and shadows

Motion transitions

Haptic feedback utilities

Web Speech API for some voice interactions

Local/demo state is currently used heavily

No need to introduce a new backend/database architecture unless a task explicitly requires it

3. Important Project Files

Main routing/state

src/App.tsx

src/types.ts

Navigation

src/components/Navbar.tsx

Main dashboard

src/components/DashboardView.tsx

Existing life-stage modules

src/components/PubertyView.tsx

src/components/PregnancyView.tsx

Other modules

src/components/VirtualMomView.tsx

src/components/HusbandDashboardView.tsx

src/components/ProfileView.tsx

src/components/LoginView.tsx

Data/content

src/data.ts

Utilities

src/utils/flutterCodeGenerator.ts

src/utils/haptics.ts

Backend

server.ts

Styling

src/index.css

Public assets

public/assets/

4. Current Routing Model

AppScreen currently contains:

login

dashboard

puberty

pregnancy_prenatal

pregnancy_postnatal

virtual_mother

husband_dashboard

profile

LifeStage currently contains:

puberty

pregnancy_prenatal

pregnancy_postnatal

virtual_mother

husband_dashboard

Menopause addition

Add a dedicated screen/life-stage such as:

menopause

Keep naming consistent across:

AppScreen

LifeStage

navigation

dashboard card

routing

menopause component

any generated Flutter/source-code mapping that needs the stage

Do not use as any as the permanent solution for menopause.

5. Dashboard State Before Menopause Work

DashboardView.tsx already has a menopause card.

Current card behavior:

id: menopause

title: Menopause

subtitle: Hormonal balance & Ayurvedic yoga care.

image currently reuses assets/puberty.png

badge: Coming Soon 🪷

isComingSoon: true

This card must be converted into a real navigation card after the menopause module is implemented.

Expected behavior:

no "Coming Soon" label

clicking the card opens the menopause module

appropriate menopause artwork should be used if an asset is available/created

preserve the existing dashboard design language

6. Puberty Module Pattern

The menopause experience should use Puberty as a major structural reference.

Puberty is not just a static information page. Its concept includes:

overview/education

cycle/body awareness

symptom tracking

safe/private space

media/resources

community

mentorship/AI assistance

consultation/health guidance

Menopause should feel like a sibling module, not a completely unrelated page.

Do not copy puberty wording blindly. Reuse architecture and interaction patterns where they make sense.

7. Pregnancy Module Pattern

Pregnancy has a richer modular structure with areas such as:

routines

safe space

AI mental-health support

media library

consultation

social/diet content

community

Menopause can use a similar modular card/grid approach.

Possible menopause modules:

Menopause Overview

what menopause is

perimenopause vs menopause vs postmenopause

what changes are normal

when to seek medical help

Symptom & Wellness Tracker

hot flashes

night sweats

sleep

mood

energy

headaches

joint/muscle discomfort

vaginal/urinary symptoms

cycle changes during perimenopause

personal notes

Daily Routines

movement

sleep hygiene

hydration

balanced nutrition

stress management

yoga/breathing

culturally familiar wellness suggestions

AI Menopause Guide

educational, supportive answers

explain symptoms in simple language

encourage professional evaluation when needed

never diagnose

Community

menopause/perimenopause discussion space

moderated posts

peer experiences

supportive conversations

report/moderation controls

Doctor / Consultation

gynecologist/OB-GYN

general physician

endocrinology-related care when appropriate

women's health specialists

appointment/availability UI can be demo data unless backend booking is explicitly requested

Media & Resources

articles

videos

audio/breathing guidance

menopause education

Private Safe Space

private notes/journal

symptom observations

personal reflections

privacy messaging

The exact modules can be adjusted to fit the existing UI if the current code already has reusable components.

8. Medical Content Rules

Mathreya is a health/wellness product, not a diagnostic replacement.

For menopause content:

Use clear, simple educational language.

Do not claim that every symptom is caused by menopause.

Do not diagnose conditions.

Do not prescribe prescription medicines.

Do not give unsafe supplement/herbal dosing.

Ayurvedic/traditional wellness content must be framed as optional supportive wellness, not as a replacement for medical care.

Encourage a clinician for persistent, severe, unusual, or concerning symptoms.

Include appropriate red-flag guidance where useful.

AI should distinguish general information from personal medical advice.

Important distinction:
Perimenopause is the transition before menopause. Menopause is clinically defined after 12 consecutive months without a menstrual period when there is no other obvious cause. Postmenopause follows menopause.

Avoid presenting menopause as an illness. It is a normal life stage, although symptoms can require treatment/support.

9. Community Design

The user specifically wants menopause to have a community area similar to the existing life-stage modules.

Community should support:

post title

post content

author display

age group where appropriate

likes

comments count

date

moderated status

stage = menopause

Community should feel supportive rather than like an unmoderated medical forum.

Potential categories:

symptoms

sleep

nutrition

emotional wellbeing

movement

relationships

work/life

doctor experiences

perimenopause questions

postmenopause wellbeing

Never expose private user health data publicly.

10. Doctor / Consultation Design

Menopause should include a doctor/consultation area similar to the other healthcare modules.

Possible specialists:

Gynecologist / OB-GYN

Women's health physician

General physician

Endocrinologist where relevant

Mental health professional where relevant

Demo doctor cards may include:

name

specialty

experience

hospital/clinic

rating

availability

avatar

If real booking is not implemented, clearly treat it as a UI/demo experience. Do not pretend a booking was actually made.

11. Data Model Expectations

If adding menopause-specific TypeScript types, keep them focused and reusable.

Potential additions:

menopause symptom log

menopause wellness entry

menopause community post stage

menopause doctor/consultation data

menopause media item category

menopause phase (perimenopause, menopause, postmenopause) if useful

Avoid changing unrelated existing interfaces unless required.

If CommunityPost.stage uses LifeStage, update the union so menopause can be represented safely.

If JournalEntry.category is used by the menopause safe space, extend it appropriately rather than using unsafe casts.

12. Visual / UX Direction

Preserve Mathreya's established visual identity:

warm cream background

terracotta/rosewood accents

soft brown text

rounded 2xl/3xl cards

clean spacing

subtle shadows

elegant serif headings + readable sans-serif body

Indian/traditional warmth without making the UI look old-fashioned

mobile-first layout

responsive desktop layout

accessible touch targets

Menopause should visually belong to Mathreya.

Do not introduce a completely different color system or design language.

13. Existing AI Personality

Mathreya AI should feel:

compassionate

calm

non-judgmental

culturally familiar

concise

easy to understand

Virtual Amma is emotionally warm and motherly.

Puberty Assistant is more like a reassuring elder sister/health guide.

Menopause AI should be:

mature

reassuring

respectful

evidence-aware

supportive

not infantilizing

Do not call a 45–55 year old user "girl" or use overly childish language in the menopause assistant.

14. Backend AI Integration

Existing endpoint:
POST /api/ai/chat

For menopause, a dedicated persona can be introduced, for example:
menopause_assistant

The system instruction should tell the model:

it is a women's health education assistant

it supports perimenopause, menopause and postmenopause questions

it gives general educational information

it does not diagnose

it does not prescribe medication

it recommends professional evaluation for concerning symptoms

it should be concise and easy to read

Do not expose the Gemini API key in frontend code.

15. Flutter Context

The project also contains:
flutter_project/

Relevant existing files include:

lib/main.dart

lib/models/app_models.dart

lib/screens/dashboard_screen.dart

lib/screens/husband_screen.dart

lib/screens/login_screen.dart

lib/screens/pregnancy_screen.dart

lib/screens/profile_screen.dart

lib/screens/puberty_screen.dart

lib/screens/virtual_mother_screen.dart

The React web project includes a Flutter code generation modal.

If a task explicitly asks to add menopause to the Flutter version too:

update Flutter models/enums

dashboard navigation

menopause screen

relevant generated source mapping

keep web and Flutter life-stage names consistent

Do not modify Flutter code for a web-only task.

16. Existing Authentication / Profile

The current app uses local/demo user state in App.tsx.

Example user:

name: Ananya Sharma

age: 26

stage: pregnancy_prenatal

location: Bengaluru, Karnataka

Profile includes:

personal details

email

phone

location

biometric toggle

emergency contact

Do not hard-code menopause-specific user data into the default profile unless the task explicitly requires it.

17. Current Project Status

The existing project is already a functioning React/Vite application with multiple modules.

The menopause card is the obvious incomplete area:

dashboard card exists

route/type does not fully exist

dedicated menopause view does not exist

menopause AI persona does not exist

menopause-specific content/data does not exist

The goal is to turn this placeholder into a complete, consistent life-stage module.

18. Development Principles

When modifying the project:

Inspect existing components before creating new patterns.

Reuse existing styles and UI patterns.

Reuse existing icons/utilities where possible.

Keep TypeScript type-safe.

Avoid as any unless there is a genuine unavoidable boundary.

Avoid unnecessary dependency additions.

Do not rewrite unrelated components.

Keep mobile responsiveness intact.

Preserve existing features.

Run the project's TypeScript/build checks after changes when possible.

Fix errors introduced by the change.

Do not remove working features just to simplify the menopause implementation.

19. Definition of Done for Menopause

Menopause is considered integrated when:

dashboard card opens menopause

"Coming Soon" is removed

menopause has a dedicated route/screen

menopause has a polished overview

symptom/wellness tracking exists

community exists

doctor/consultation area exists

media/resources exists

AI menopause assistant exists if requested by the task

safe/private area exists if requested

responsive UI works

TypeScript types are correct

existing puberty/pregnancy/partner/Amma features still work

no unrelated regressions are introduced