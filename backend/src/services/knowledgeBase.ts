/**
 * SafeWalk curated knowledge base.
 *
 * Why this exists: emergency and first-aid answers must not depend only on what a language
 * model happens to remember. The chatbot retrieves the most relevant entries below and
 *   (a) gives them to the LLM as REFERENCE MATERIAL it must stay within, and
 *   (b) answers directly from them when no LLM is configured or the LLM is unavailable.
 *
 * Sources: entries are short paraphrases of widely published guidance from the organisations
 * listed in `SOURCES` (NHS first aid, WHO falls fact sheet, American Red Cross first-aid
 * guidance, Government of India's 112 emergency number). They are NOT verbatim copies.
 *
 * ⚠ REVIEW REQUIRED: before SafeWalk is used by real people, have a qualified health
 * professional review every entry against the current version of the cited source.
 * Only the URLs listed in SOURCES are used as links; no other citation is generated.
 */

export interface SourceRef {
  name: string
  url?: string
}

export const SOURCES = {
  NHS_FIRST_AID: { name: 'NHS – First aid', url: 'https://www.nhs.uk/conditions/first-aid' },
  NHS_CPR: { name: 'NHS – CPR (cardiopulmonary resuscitation)', url: 'https://www.nhs.uk/tests-and-treatments/first-aid/cpr/' },
  WHO_FALLS: { name: 'World Health Organization – Falls fact sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/falls' },
  RED_CROSS: { name: 'American Red Cross – First aid guidance' },
  INDIA_112: {
    name: 'Ministry of Home Affairs, India – Emergency Response Support System (112)',
    url: 'https://www.mha.gov.in/en/commoncontent/emergency-response-support-system-erss',
  },
  SAFEWALK: { name: 'SafeWalk application documentation' },
} satisfies Record<string, SourceRef>

export type KbCategory = 'app' | 'emergency' | 'first_aid' | 'prevention' | 'home_safety' | 'preparedness'

export interface KbEntry {
  id: string
  category: KbCategory
  title: string
  /** Lower-case words / phrases used for retrieval. */
  keywords: string[]
  /** Short markdown-style text (bold, "- " bullets and "1. " steps only). */
  content: string
  sources: SourceRef[]
  /** Part of the "call emergency services first" group. */
  critical?: boolean
}

export const EMERGENCY_NUMBER_NOTE =
  'In India call **112** (the national emergency number). If you are elsewhere, call your local emergency number.'

const MEDICAL_FOOTER =
  'This is general first-aid information, not a diagnosis or a replacement for emergency services, a doctor or trained first responders.'

export const KNOWLEDGE_BASE: KbEntry[] = [
  // ------------------------------------------------------------------ SafeWalk help
  {
    id: 'app-what-is',
    category: 'app',
    title: 'What is SafeWalk?',
    keywords: ['what is safewalk', 'about safewalk', 'safewalk', 'purpose', 'what does safewalk do', 'overview'],
    content:
      'SafeWalk is a fall-detection **prototype** for people at risk of falling, such as older adults.\n' +
      '- It uses your webcam and an AI pose model (MediaPipe) running **in your browser** to watch body posture.\n' +
      '- A custom algorithm looks for a sudden fall followed by staying down.\n' +
      '- If a possible fall is found, a countdown starts. If you do not press **"I\'m Safe – Cancel Alert"**, SafeWalk sends an e-mail to your primary emergency contact.\n' +
      '- It does **not** call ambulances or emergency services, and it is not a medically validated device.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-how-detection',
    category: 'app',
    title: 'How does fall detection work?',
    keywords: ['how does fall detection work', 'fall detection', 'algorithm', 'mediapipe', 'pose', 'landmarks', 'posture', 'how does safewalk detect', 'detect falls'],
    content:
      '**Step 1 – Pose:** MediaPipe Pose Landmarker finds 33 body points (shoulders, hips, knees, ankles…) in each camera frame, locally in your browser. Video is not uploaded.\n' +
      '**Step 2 – Measurements:** the algorithm tracks the torso angle (upright vs horizontal), how fast and how far the hips drop, and the body shape over the last few seconds.\n' +
      '**Step 3 – Candidate:** a fast downward movement together with the torso tipping over creates a fall *candidate*.\n' +
      '**Step 4 – Persistence:** the person must then stay near-horizontal for about 1.5 seconds. If they get back up, nothing is raised.\n' +
      '**Step 5 – Countdown:** a possible fall starts the emergency countdown.\n' +
      'Lying down slowly, sitting down or bending over should not trigger it, but accuracy depends on camera position, lighting, distance and visibility, and it is never 100%.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-getting-started',
    category: 'app',
    title: 'Register, log in and first set-up',
    keywords: ['register', 'sign up', 'create account', 'log in', 'login', 'sign in', 'get started', 'getting started', 'set up', 'setup'],
    content:
      '1. Open SafeWalk and choose **Register**. Enter name, e-mail, phone number and a password (8+ characters with a letter and a number).\n' +
      '2. You are signed in automatically. Later, use **Log in** with the same e-mail and password.\n' +
      '3. Go to **Emergency Contacts** and add at least one contact (the first one becomes primary).\n' +
      '4. Go to **Monitoring** and press **Start Monitoring**.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-start-monitoring',
    category: 'app',
    title: 'How do I start camera monitoring?',
    keywords: ['start monitoring', 'begin monitoring', 'start camera', 'turn on camera', 'how do i start', 'monitoring page', 'stop monitoring'],
    content:
      '1. Make sure you have at least one emergency contact.\n' +
      '2. Open **Monitoring** and press **Start Monitoring**.\n' +
      '3. Allow camera access when the browser asks. The camera only turns on after you press the button.\n' +
      '4. Place the camera so your whole body (head to feet) is visible, with good lighting, about 2–3 metres away.\n' +
      '5. The status changes from *Initializing Camera* → *Detecting Person* → *Monitoring*.\n' +
      'Press **Stop Monitoring** to release the camera. Keep the SafeWalk tab open and visible while monitoring.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-camera-trouble',
    category: 'app',
    title: 'Why is my camera not working?',
    keywords: ['camera not working', 'camera error', 'camera permission', 'permission denied', 'no camera', 'camera blocked', 'webcam', 'camera unavailable', 'camera not found'],
    content:
      'Try these in order:\n' +
      '1. Click the camera/lock icon in the browser address bar and set Camera to **Allow**, then reload.\n' +
      '2. Close other apps that may be using the camera (Zoom, Teams, another tab).\n' +
      '3. Check the camera is plugged in and not disabled in your operating-system privacy settings.\n' +
      '4. Camera access needs a secure page: **https://** or **http://localhost**.\n' +
      '5. Try another browser (Chrome, Edge or Firefox) and press **Start Monitoring** again.\n' +
      'SafeWalk shows the exact problem (permission denied, no camera found, camera busy) on the Monitoring page.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-not-detected',
    category: 'app',
    title: 'Why is my body not being detected / landmarks not visible?',
    keywords: ['not detected', 'body not detected', 'person not detected', 'landmarks not visible', 'no landmarks', 'skeleton', 'not being detected', 'cannot see me', 'pose not showing'],
    content:
      '- Step back so your **shoulders, hips and knees** are in view (ideally the whole body).\n' +
      '- Improve lighting: face a light source; avoid strong backlight such as a bright window behind you.\n' +
      '- Wear clothing that contrasts with the background.\n' +
      '- Keep the camera at about chest/waist height, steady and slightly angled down — not on the floor or ceiling.\n' +
      '- Make sure only the area you want is in view; furniture hiding your body blocks detection.\n' +
      '- Wait a second after starting: the AI model must finish loading.\n' +
      'If the model file is missing, the Monitoring page says so — see the README step "MediaPipe model".',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-states',
    category: 'app',
    title: 'What are the monitoring states?',
    keywords: ['monitoring states', 'states', 'status meaning', 'what does idle mean', 'initializing camera', 'detecting person', 'countdown state', 'alert sent'],
    content:
      '- **Idle** – monitoring is off, camera released.\n' +
      '- **Initializing Camera** – asking for the camera and loading the AI model.\n' +
      '- **Detecting Person** – camera works, no person found yet.\n' +
      '- **Monitoring** – a person is visible and being analysed.\n' +
      '- **Possible Fall Detected** – the algorithm found a fall-like movement that persisted.\n' +
      '- **Fall Confirmation Countdown** – you can still cancel.\n' +
      '- **Fall Confirmed** – the countdown ended; the event is being sent to the server.\n' +
      '- **Alert Sent** – the server answered; the e-mail status is shown ("sent" means the mail server accepted it; it does not prove it was read).\n' +
      '- **Error** – something failed (camera, model or network); the message explains what.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-contacts',
    category: 'app',
    title: 'How do I add or change emergency contacts / set a primary contact?',
    keywords: ['add emergency contact', 'emergency contact', 'add contact', 'edit contact', 'delete contact', 'primary contact', 'set primary', 'configure emergency contacts', 'contacts'],
    content:
      '1. Open **Emergency Contacts**.\n' +
      '2. Press **Add contact**, enter name, e-mail address and relationship. A phone number is optional.\n' +
      '3. Tick **Primary contact** or press **Make primary** on an existing contact.\n' +
      '4. Use **Edit** or **Delete** to change or remove a contact.\n' +
      'E-mail alerts go to the **primary** contact only. Keep addresses up to date.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-fall-flow',
    category: 'app',
    title: 'What happens when a fall is detected? How do I cancel a false alarm?',
    keywords: ['what happens when a fall is detected', 'fall detected', 'cancel alert', 'false alarm', 'cancel false alarm', 'countdown', "i'm safe", 'im safe', 'cancel'],
    content:
      '1. A large warning and a countdown appear (10 seconds by default) with a beeping sound if sound is on.\n' +
      '2. Press **"I\'m Safe – Cancel Alert"** if you are fine. The event is saved as *cancelled* and no e-mail is sent.\n' +
      '3. If the countdown reaches zero, the fall is *confirmed*: it is saved to the database and an e-mail is sent to your primary contact.\n' +
      '4. The real status is shown (*sent* or *failed*). SafeWalk does **not** contact ambulances or emergency services — call 112 yourself if you need help.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-email-failed',
    category: 'app',
    title: 'Why did my emergency e-mail fail?',
    keywords: ['email failed', 'e-mail failed', 'email not sent', 'email not received', 'mail failed', 'message failed', 'alert failed', 'notification failed', 'not_configured', 'no_contact', 'did not receive email', 'emergency email', 'emergency e-mail', 'spam', 'sms failed', 'emergency sms'],
    content:
      'SafeWalk sends alerts by e-mail (it no longer sends SMS). Open **Alerts** to see the status and error text. Common causes:\n' +
      '- **No emergency contact** saved, or the contact has **no e-mail address** → nothing can be sent. Add one.\n' +
      '- **E-mail not configured** on the server (mail settings missing) → no e-mail is sent.\n' +
      '- **Wrong address**: check the contact\'s e-mail address for typing mistakes.\n' +
      '- **Spam folder**: ask your contact to look in spam/junk and mark SafeWalk as safe.\n' +
      '- **The mail server refused the message** (wrong password, sending limit reached).\n' +
      '*Sent* only means the mail server accepted the e-mail; it does not prove it was read. Use **Send test email** in Settings to check the set-up. For failed alerts open **Fall History** and use **Resend alert**, and call your contact directly.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-countdown-config',
    category: 'app',
    title: 'How do I configure the countdown?',
    keywords: ['configure countdown', 'configure the countdown', 'set the countdown', 'change the countdown', 'countdown duration', 'change countdown', 'countdown time', 'settings', 'sensitivity', 'alert sound', 'location sharing'],
    content:
      'Open **Settings** → *Monitoring preferences*. You can set the countdown from 5 to 60 seconds (default 10), choose detection sensitivity (Low = fewer alerts, High = more), switch the alert sound on/off and turn location sharing on (the browser will ask for permission). Press **Save settings**.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-browser-closed',
    category: 'app',
    title: 'Does SafeWalk work when the browser is closed?',
    keywords: ['browser closed', 'browser is closed', 'closed browser', 'close the browser', 'close browser', 'when my browser', 'background', '24/7', 'always on', 'tab closed', 'screen off', 'sleep', 'work when closed'],
    content:
      '**No.** Monitoring only works while the SafeWalk page is open, the camera is running and the device is awake. If you close the tab, minimise the browser for a long time, lock the screen or the computer sleeps, detection stops. SafeWalk does not provide 24/7 background monitoring.',
    sources: [SOURCES.SAFEWALK],
  },
  {
    id: 'app-privacy-limits',
    category: 'app',
    title: 'Privacy and limitations',
    keywords: ['privacy', 'is my video uploaded', 'video stored', 'limitations', 'accuracy', 'is it accurate', 'medical device', 'data stored', 'safe to use', 'reliable'],
    content:
      '**Privacy:** pose detection runs locally in your browser; video is never uploaded or stored. Only the event (time, status, an optional evidence score, optional location if you enabled it) is sent to the server. Passwords are hashed. The chatbot never receives camera frames.\n' +
      '**Limitations:** SafeWalk is a prototype, not a medically validated device and not 100% accurate. Results vary with camera position, lighting, body visibility, distance, clothing, occlusion by furniture and individual movement. It may miss falls or raise false alarms. Do not rely on it as your only safety measure.',
    sources: [SOURCES.SAFEWALK],
  },

  // ------------------------------------------------------------------ Emergency guidance
  {
    id: 'em-someone-falls',
    category: 'emergency',
    title: 'What to do if someone falls',
    keywords: ['someone falls', 'someone fell', 'person fell', 'fall', 'fallen', 'what should i do if someone falls', 'they fell', 'he fell', 'she fell', 'collapsed'],
    content:
      '1. **Stay calm and do not rush them to stand up.** Check they are responsive: speak to them and ask if they are hurt.\n' +
      '2. **Call 112 immediately** if they are unconscious, not responding, not breathing normally, bleeding heavily, have severe pain, hit their head, or you suspect a broken bone, neck/back or hip injury.\n' +
      '3. If a neck, back or hip injury is possible, **do not move them** unless there is immediate danger (fire, traffic). Keep them still and warm with a blanket or coat.\n' +
      '4. Do not give food, drink or medicine.\n' +
      '5. Stay with them until help arrives and follow the dispatcher\'s instructions.\n' +
      '6. If they are alert, calm, and have no pain or signs of injury, help them up **slowly and in stages** (see "cannot get up" guidance) and arrange a medical check, especially after a head knock or if they take blood thinners.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'em-elderly-cannot-get-up',
    category: 'emergency',
    title: 'An elderly person has fallen and cannot get up',
    keywords: ['elderly person falls', 'cannot get up', "can't get up", 'unable to get up', 'cannot stand', 'elderly fell', 'old person fell', 'grandmother fell', 'grandfather fell', 'stuck on floor', 'on the floor'],
    content:
      '1. **Do not pull them up.** Ask where it hurts and check they are awake and breathing normally.\n' +
      '2. **Call 112** if they cannot move a limb, have severe pain (hip, back, neck, head), a visible deformity, were knocked out, are confused or drowsy, or if you are unsure.\n' +
      '3. Make them comfortable where they are: put a pillow or folded cloth under the head only if no neck injury is suspected, and cover them with a blanket to keep warm.\n' +
      '4. Do not give food, drink or tablets.\n' +
      '5. Stay with them, keep talking calmly, and follow the dispatcher\'s instructions.\n' +
      'Older people can have serious injuries (such as a hip fracture) without obvious signs, so a medical check is advisable after any fall they cannot recover from.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.WHO_FALLS, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'em-unconscious',
    category: 'first_aid',
    title: 'Someone is unconscious',
    keywords: ['unconscious', 'unresponsive', 'passed out', 'not waking', 'will not wake up', "won't wake up", 'not responding', 'collapsed and not responding', 'fainted and not waking', 'become unconscious', 'becomes unconscious'],
    content:
      '1. **Call 112 now** (or ask someone else to) and put the phone on speaker. Follow the dispatcher\'s instructions.\n' +
      '2. Check for danger, then tap their shoulders and shout. If no response, tilt the head back gently, lift the chin and look/listen/feel for breathing for no more than 10 seconds.\n' +
      '3. **Breathing normally:** unless you suspect a neck/spine injury, roll them onto their side into the **recovery position**, keep the airway open, stay with them and keep checking breathing until help arrives.\n' +
      '4. **Not breathing, or only gasping (gasps are not normal breathing):** start chest compressions (see "not breathing").\n' +
      '5. **Do not** give food, water or medicine to an unconscious person, and do not leave them alone.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.NHS_CPR, SOURCES.RED_CROSS, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'em-not-breathing',
    category: 'first_aid',
    title: 'Someone is not breathing normally (CPR)',
    keywords: ['not breathing', 'stopped breathing', 'not breathing normally', 'no breathing', 'cpr', 'cardiac arrest', 'heart stopped', 'chest compressions', 'gasping', 'no pulse'],
    content:
      '1. **Call 112 immediately** (speaker on). Tell them the person is not breathing normally and follow the dispatcher\'s instructions.\n' +
      '2. Lay the person on their back on a firm, flat surface.\n' +
      '3. **Hands-only CPR:** kneel beside them, place the heel of one hand on the centre of the chest, put your other hand on top and push **hard and fast** straight down — about 5–6 cm deep, roughly 100–120 pushes a minute — letting the chest rise fully between pushes.\n' +
      '4. **Do not stop** until emergency help takes over, the person starts breathing normally, or you are too exhausted to continue.\n' +
      '5. If an automated external defibrillator (AED) is available, switch it on and follow its voice instructions.\n' +
      'If you are untrained, hands-only compressions are still far better than doing nothing. A first-aid course teaches CPR properly. ' +
      MEDICAL_FOOTER,
    sources: [SOURCES.NHS_CPR, SOURCES.RED_CROSS, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'em-difficulty-breathing',
    category: 'first_aid',
    title: 'Someone has difficulty breathing',
    keywords: ['difficulty breathing', 'trouble breathing', 'hard to breathe', 'cannot breathe', "can't breathe", 'short of breath', 'shortness of breath', 'breathless', 'wheezing', 'struggling to breathe', 'breathing problem'],
    content:
      '1. **Call 112** if the breathlessness is severe, sudden, getting worse, with chest pain, blue/grey lips, confusion, or they cannot speak full sentences.\n' +
      '2. Help them into a comfortable position — usually sitting upright, leaning slightly forward.\n' +
      '3. Loosen tight clothing and open a window for fresh air. Stay calm and reassure them.\n' +
      '4. If they have their own prescribed emergency medicine, the dispatcher can guide how it should be used; do not give anything else.\n' +
      '5. If they stop responding or stop breathing normally, follow the CPR steps and keep following the dispatcher.\n' +
      MEDICAL_FOOTER,
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'em-head-injury',
    category: 'first_aid',
    title: 'Head injury after a fall',
    keywords: ['head injury', 'hit head', 'hit their head', 'bumped head', 'head trauma', 'concussion', 'blow to the head', 'knock on the head', 'head wound'],
    content:
      '**Call 112 immediately** if there is any of: loss of consciousness (even briefly), repeated vomiting, confusion, unusual drowsiness, a seizure, fluid or blood from the nose or ears, worsening headache, weakness or numbness, trouble speaking or seeing, or if the person is elderly or takes blood thinners.\n' +
      '1. Keep the person still and calm; do not move them if a neck injury is possible.\n' +
      '2. Press a clean cloth firmly on any bleeding scalp wound (do not press if the skull may be broken or an object is stuck).\n' +
      '3. A cold pack wrapped in cloth can be held on a bump.\n' +
      '4. Stay with them and watch for the warning signs above for the next 24 hours; get a medical check even if they seem fine.\n' +
      MEDICAL_FOOTER,
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'fa-fracture',
    category: 'first_aid',
    title: 'Suspected broken bone (fracture)',
    keywords: ['fracture', 'broken bone', 'suspected fracture', 'broken arm', 'broken leg', 'broken hip', 'bone broken', 'cracked bone', 'deformed limb'],
    content:
      '1. **Call 112** if the injury is to the hip, pelvis, back, neck or head, the bone has come through the skin, the limb looks deformed, there is heavy bleeding, or the person is faint or in severe pain.\n' +
      '2. Keep the injured part still; **do not try to straighten it** and do not move the person unless in immediate danger.\n' +
      '3. Support the limb in the position found with rolled clothing/cushions, cover any open wound with a clean dressing and press gently around it (not on a protruding bone) to control bleeding.\n' +
      '4. Keep the person warm and calm. Do not give food or drink (they may need an operation).\n' +
      '5. Stay with them until help arrives.\n' +
      MEDICAL_FOOTER,
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS],
  },
  {
    id: 'fa-bleeding',
    category: 'first_aid',
    title: 'Bleeding',
    keywords: ['bleeding', 'blood', 'cut', 'wound', 'severe bleeding', 'heavy bleeding', 'bleeding heavily', 'minor cut', 'laceration', 'blood loss', 'bleeding won\'t stop'],
    content:
      '**Severe bleeding (spurting, soaking through cloth, will not stop):** call **112** immediately.\n' +
      '1. Wear gloves if you have them. Press firmly with a clean cloth or dressing directly on the wound and **keep pressing**.\n' +
      '2. If blood soaks through, add more cloth on top — do not remove the first layer.\n' +
      '3. If there is no suspected fracture, raise the injured limb above heart level and lay the person down; keep them warm.\n' +
      '4. Do not remove objects stuck in the wound; press around them.\n' +
      '**Minor cut:** wash hands, rinse the cut under clean running water, press with a clean cloth until bleeding stops, then cover with a clean dressing. Seek medical advice for deep, dirty or gaping wounds.\n' +
      MEDICAL_FOOTER,
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS],
    critical: true,
  },
  {
    id: 'em-stairs',
    category: 'emergency',
    title: 'Someone falls down the stairs',
    keywords: ['fell down the stairs', 'fall down stairs', 'fell down stairs', 'fall down the stairs', 'tumbled down stairs', 'staircase fall', 'stairs fall', 'fell from stairs'],
    content:
      'A fall down stairs can cause head, neck, spine and hip injuries.\n' +
      '1. **Do not move the person** unless they are in immediate danger. Do not let them get up.\n' +
      '2. **Call 112** — especially if they hit their head, lost consciousness, have neck/back pain, cannot move a limb, are confused, or are elderly.\n' +
      '3. Keep them still, supported and warm; talk calmly and check breathing.\n' +
      '4. Control any bleeding with firm pressure on a clean cloth.\n' +
      '5. Give no food, drink or medicine, and follow the dispatcher\'s instructions until help arrives.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'em-severe-pain',
    category: 'emergency',
    title: 'Someone is in severe pain',
    keywords: ['severe pain', 'terrible pain', 'unbearable pain', 'a lot of pain', 'chest pain', 'in pain', 'intense pain', 'extreme pain'],
    content:
      '1. **Call 112** for chest pain, sudden severe pain, pain after a fall with a possible fracture (hip, back, neck, head), pain with breathlessness, sweating, confusion or fainting.\n' +
      '2. Keep the person still and in the most comfortable position; do not make them walk.\n' +
      '3. Do not give food or drink, and do not give tablets unless the emergency dispatcher or a doctor tells you to.\n' +
      '4. Stay with them and describe their symptoms to the dispatcher.\n' +
      'A doctor must assess the cause of severe pain; this assistant cannot diagnose it.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'em-alone-after-fall',
    category: 'emergency',
    title: 'I have fallen and I am alone',
    keywords: ['i fell and i am alone', 'fallen and alone', 'alone after a fall', 'alone after fall', 'i have fallen', 'i fell', 'fell at home alone', 'someone is alone after a fall', 'nobody is home'],
    content:
      '1. **Stay calm and do not jump up.** Take a few breaths and check yourself for pain, bleeding and dizziness.\n' +
      '2. **Call for help first:** use your phone, a pendant alarm or shout/bang to attract attention. In India call **112**. If you are badly hurt, in severe pain, hit your head or cannot move, stay still and keep calling.\n' +
      '3. If you feel unhurt: roll onto your side, push up onto your hands and knees, crawl to a sturdy chair, place your hands on the seat, bring the stronger leg forward and slowly push up, then sit and rest.\n' +
      '4. If you cannot get up, try to reach a phone, keep warm (pull down a blanket or clothing) and move around a little to avoid pressure sores.\n' +
      '5. Tell someone and see a doctor afterwards, even if you feel fine.\n' +
      'Remember: SafeWalk only works while it is open and the camera sees you, and it can miss falls.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.WHO_FALLS, SOURCES.INDIA_112],
    critical: true,
  },
  {
    id: 'em-contact-no-response',
    category: 'emergency',
    title: 'An emergency contact does not respond',
    keywords: ['contact does not respond', 'contact not responding', 'no response from contact', 'nobody replied', 'contact did not answer', 'family not answering', 'no one answered', 'emergency contact does not respond'],
    content:
      '1. An e-mail being sent does not mean it was read. **Call** your contact, and try other family members, neighbours or friends.\n' +
      '2. If the person who fell may be seriously hurt, **do not wait** — call **112** yourself or ask a neighbour to check on them.\n' +
      '3. In SafeWalk, check **Alerts** for the e-mail status, and add more up-to-date contacts. Note that e-mail alerts go to the **primary** contact only; you can change which contact is primary.\n' +
      'Keep contact numbers current and tell your contacts that SafeWalk may e-mail them.',
    sources: [SOURCES.SAFEWALK, SOURCES.INDIA_112],
  },
  {
    id: 'em-safewalk-missed',
    category: 'emergency',
    title: 'SafeWalk did not detect a fall',
    keywords: ['safewalk fails to detect', 'did not detect a fall', "didn't detect", 'missed a fall', 'fall not detected', 'no alert', 'fall was not detected', 'failed to detect'],
    content:
      'If someone has fallen and SafeWalk did not react, **do not wait for it** — follow normal fall guidance: check responsiveness, call **112** if there is a serious injury or you are unsure, and contact their family directly.\n' +
      'Afterwards: check the camera shows the whole body, lighting is good, the Monitoring status was "Monitoring" (not "Detecting Person"), the tab stayed open, and consider raising sensitivity in **Settings**. SafeWalk can miss falls (for example when the person is out of view or hidden by furniture), so it should never be the only protection.',
    sources: [SOURCES.SAFEWALK, SOURCES.NHS_FIRST_AID, SOURCES.INDIA_112],
  },
  {
    id: 'fa-sprain',
    category: 'first_aid',
    title: 'Suspected sprain',
    keywords: ['sprain', 'sprained ankle', 'twisted ankle', 'twisted', 'swollen joint', 'strain'],
    content:
      'For a suspected sprain, remember **PRICE**:\n' +
      '- **P**rotect the area from further injury.\n' +
      '- **R**est it — avoid putting weight on it.\n' +
      '- **I**ce: hold a cold pack wrapped in a cloth on it for up to about 20 minutes every few hours; never put ice directly on skin.\n' +
      '- **C**ompress lightly with a bandage (not too tight).\n' +
      '- **E**levate it above the level of the heart if possible.\n' +
      '**See a doctor** if the person cannot put weight on it, the pain is severe, the joint looks deformed, there is numbness or the swelling is major — it could be a fracture.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS],
  },
  {
    id: 'fa-burns',
    category: 'first_aid',
    title: 'Burns',
    keywords: ['burn', 'burns', 'burnt', 'scald', 'scalded', 'hot water burn', 'fire burn'],
    content:
      '1. Move the person away from the heat source.\n' +
      '2. **Cool the burn under cool or lukewarm running water for 20 minutes.** Remove jewellery and loose clothing near it, unless stuck to the skin.\n' +
      '3. Cover loosely with cling film or a clean, non-fluffy dressing. **Do not** use ice, creams, butter or burst blisters.\n' +
      '4. **Call 112** for large or deep burns, burns on the face, hands, feet, genitals or joints, chemical or electrical burns, breathing difficulty, or burns in babies and older adults.\n' +
      'Keep the person warm (but not the burn) and watch for shock.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS],
  },
  {
    id: 'fa-fainting',
    category: 'first_aid',
    title: 'Fainting',
    keywords: ['faint', 'fainting', 'fainted', 'passed out briefly', 'dizzy and collapsed', 'feeling faint', 'light headed', 'lightheaded', 'blacked out'],
    content:
      '1. Lay the person flat on their back and **raise their legs** (about 30 cm) if there is no sign of injury from a fall.\n' +
      '2. Loosen tight clothing, make sure they have fresh air, and check they are breathing.\n' +
      '3. They should recover within a minute or two. Let them sit up slowly, then stand slowly. Give a drink only once they are fully alert.\n' +
      '4. **Call 112** if they do not wake up quickly, are not breathing normally, are injured, had chest pain, are pregnant, or this keeps happening.\n' +
      'Fainting in an older person, or with a fall, should be checked by a doctor — it can have a medical cause.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS],
  },
  {
    id: 'fa-choking',
    category: 'first_aid',
    title: 'Choking (adult)',
    keywords: ['choking', 'choke', 'choked', 'something stuck in throat', 'cannot speak or cough', 'food stuck', 'airway blocked'],
    content:
      '**Mild choking** (can cough, speak, breathe): encourage them to keep coughing. Do not slap their back yet.\n' +
      '**Severe choking** (cannot speak, cough or breathe): \n' +
      '1. Call **112** (or have someone call).\n' +
      '2. Give up to **5 firm back blows** between the shoulder blades with the heel of your hand, leaning them forward.\n' +
      '3. If not cleared, give up to **5 abdominal thrusts**: stand behind, fist just above the navel, other hand over it, pull sharply inwards and upwards.\n' +
      '4. Keep alternating 5 back blows and 5 thrusts until the object comes out or help arrives.\n' +
      '5. If they become unconscious, lay them down and start CPR.\n' +
      'For babies and young children, different steps apply — ask the 112 dispatcher to guide you. Anyone who needed abdominal thrusts should be checked by a doctor.',
    sources: [SOURCES.NHS_FIRST_AID, SOURCES.RED_CROSS, SOURCES.INDIA_112],
    critical: true,
  },

  // ------------------------------------------------------------------ Prevention
  {
    id: 'prev-reduce-risk',
    category: 'prevention',
    title: 'How can older people reduce their risk of falling?',
    keywords: ['reduce risk of falling', 'prevent falls', 'fall prevention', 'avoid falling', 'reduce falls', 'prevent falling', 'elderly reduce risk', 'how can elderly people reduce'],
    content:
      'Falls usually have several causes, so several small steps help:\n' +
      '- **Stay active** with strength and balance exercise (ask your doctor or physiotherapist).\n' +
      '- **Make the home safer:** good lighting, clear walkways, handrails, grab bars, non-slip mats.\n' +
      '- **Get your eyes checked** regularly and wear the right glasses.\n' +
      '- **Ask a doctor or pharmacist to review medicines**, because some cause dizziness or drowsiness. Never stop a medicine on your own.\n' +
      '- **Wear well-fitting shoes** with non-slip soles.\n' +
      '- Take your time when standing up, and report dizziness, balance problems or a recent fall to a healthcare professional.\n' +
      'The WHO notes that adults over 60 suffer the greatest number of fatal falls, and that exercise, medicine review, vision care and home modification are among the effective approaches.',
    sources: [SOURCES.WHO_FALLS],
  },
  {
    id: 'prev-exercise',
    category: 'prevention',
    title: 'Exercises that can improve balance and strength',
    keywords: ['exercise', 'exercises', 'balance exercises', 'improve balance', 'strength', 'tai chi', 'physiotherapy', 'physical activity', 'improve mobility', 'mobility', 'stronger legs', 'workout'],
    content:
      'Regular physical activity that builds leg strength and balance lowers the risk of falling. Examples often recommended (check with your doctor or a physiotherapist first, and stop if you feel pain or dizzy):\n' +
      '- **Sit-to-stand:** stand up from a sturdy chair and sit down slowly, a few times.\n' +
      '- **Heel raises:** hold a counter or chair back and rise onto your toes.\n' +
      '- **Weight shifts and single-leg stands:** near a counter you can grab.\n' +
      '- **Heel-to-toe walking** along a wall or counter.\n' +
      '- **Walking regularly** on safe, even ground; **Tai Chi** or a supervised balance class is widely recommended.\n' +
      'Start gently, always have something stable to hold, and increase gradually. People with health conditions or balance problems should get personal advice.',
    sources: [SOURCES.WHO_FALLS],
  },
  {
    id: 'prev-balance-precautions',
    category: 'prevention',
    title: 'Precautions for people with balance difficulties or walking aids',
    keywords: ['balance difficulties', 'balance problems', 'walking aid', 'walking aids', 'walking stick', 'cane', 'walker', 'rollator', 'unsteady', 'precautions while walking', 'reduce the risk of falling while walking', 'dizzy walking'],
    content:
      '- Discuss balance problems with a doctor; the cause may be treatable.\n' +
      '- Use a walking aid if recommended, and have a professional check its **height and fit**. Replace worn rubber tips.\n' +
      '- Walk slowly on even ground; look where you step; avoid carrying heavy loads in both hands.\n' +
      '- Wear supportive, non-slip shoes (not socks or loose slippers on hard floors).\n' +
      '- Stand up slowly from lying or sitting and pause before walking, especially if you feel light-headed.\n' +
      '- Take extra care on wet, uneven or poorly lit surfaces and on stairs; use the handrail.\n' +
      '- Keep a phone within reach and let someone know your routine.',
    sources: [SOURCES.WHO_FALLS, SOURCES.NHS_FIRST_AID],
  },
  {
    id: 'home-elderly-safer',
    category: 'home_safety',
    title: 'Making a home safer for older people',
    keywords: ['make my home safer', 'home safety', 'safer home', 'home safer for elderly', 'safe home', 'home modifications', 'remove hazards', 'make home safe', 'house safe', 'childproof elderly'],
    content:
      '- **Clear walkways** of clutter, shoes, boxes and cords. Fix or remove loose rugs, or use non-slip backing.\n' +
      '- **Good lighting** everywhere, including night lights on the way to the bathroom and light switches at both ends of stairs and hallways.\n' +
      '- **Handrails** on both sides of stairs and **grab bars** by the toilet and in the shower/tub.\n' +
      '- **Non-slip mats** in the bathroom and kitchen; wipe up spills quickly.\n' +
      '- Keep **everyday items within easy reach** so there is no need for step-stools or climbing.\n' +
      '- Secure loose wires and extension cords along walls.\n' +
      '- Keep pets from getting under foot, and keep a phone or alarm within reach.\n' +
      'A home-safety check by a healthcare professional or occupational therapist can find hazards you miss.',
    sources: [SOURCES.WHO_FALLS],
  },
  {
    id: 'home-bathroom',
    category: 'home_safety',
    title: 'Making the bathroom safer and preventing slipping',
    keywords: ['bathroom', 'prevent slipping', 'slippery', 'slip in the bathroom', 'shower', 'bathtub', 'toilet', 'grab bar', 'grab bars', 'non-slip mat', 'why are grab bars'],
    content:
      '- Install **grab bars** inside and outside the shower/tub and next to the toilet. They give something solid to hold when standing, sitting or if you lose your balance (towel rails are not strong enough).\n' +
      '- Use **non-slip mats or strips** inside the tub/shower and a non-slip bath mat outside it.\n' +
      '- Consider a shower chair and a hand-held shower, and a raised toilet seat if standing up is hard.\n' +
      '- Keep the floor dry, wipe spills, and make sure the light is bright (a night light helps).\n' +
      '- Keep soap and towels within reach, and sit while drying feet.\n' +
      '- Do not lock the bathroom door; keep a phone or alarm within reach.',
    sources: [SOURCES.WHO_FALLS],
  },
  {
    id: 'home-stairs-lighting',
    category: 'home_safety',
    title: 'Safer staircases, lighting, rugs and footwear',
    keywords: ['staircase', 'stairs', 'handrail', 'handrails', 'lighting', 'light', 'rugs', 'loose wires', 'cords', 'carpet', 'footwear', 'shoes', 'slippers', 'obstacles', 'walkways', 'tripping'],
    content:
      '- **Stairs:** handrails on both sides, steps in good repair, nothing stored on them, bright light with switches at top and bottom, and visible edges on steps.\n' +
      '- **Lighting:** bright, glare-free light in every room and passage; night lights between bedroom and bathroom.\n' +
      '- **Obstacles:** keep walkways clear; move furniture so paths are wide and straight.\n' +
      '- **Rugs and carpets:** remove loose rugs or fix them with non-slip backing or tape; repair curled edges.\n' +
      '- **Wires:** run cords along walls, never across walkways.\n' +
      '- **Footwear:** well-fitting shoes with non-slip, thin, firm soles and a closed back; avoid walking in socks, loose slippers or high heels indoors.',
    sources: [SOURCES.WHO_FALLS],
  },
  {
    id: 'health-vision-medicines',
    category: 'prevention',
    title: 'Vision, dizziness and medicines',
    keywords: ['vision', 'eye', 'eyes', 'eyesight', 'glasses', 'dizziness', 'dizzy', 'medication', 'medications', 'medicine', 'medicines', 'tablets', 'drowsy', 'side effects', 'doctor about balance', 'checkup'],
    content:
      '- **Vision:** poor eyesight makes hazards harder to see. Have your eyes checked regularly (many guidelines suggest at least once a year for older adults) and keep glasses up to date.\n' +
      '- **Dizziness or balance problems:** tell a doctor. They can look for causes such as low blood pressure, inner-ear problems or other conditions that may be treatable.\n' +
      '- **Medicines:** some medicines (and combinations of them) can cause dizziness or drowsiness. Ask a doctor or pharmacist to review all your medicines, including over-the-counter ones. **Do not stop or change any medicine on your own.**\n' +
      '- Alcohol can add to dizziness and drowsiness.',
    sources: [SOURCES.WHO_FALLS],
  },
  {
    id: 'prep-contacts-kit',
    category: 'preparedness',
    title: 'Emergency contact list and first-aid kit',
    keywords: ['first-aid kit', 'first aid kit', 'emergency contact list', 'prepare contact list', 'what should i keep', 'emergency kit', 'family should know', 'emergency plan', 'response plan', 'keep updated'],
    content:
      '**Contact list:** write down 112, family, neighbours, the family doctor and the nearest hospital; keep a copy by the phone and in the phone itself, and update it whenever numbers change.\n' +
      '**Information family should know:** medical conditions, medicines and allergies, doctor\'s name, home address and how to get in (spare key with a trusted person).\n' +
      '**First-aid kit basics:** sterile dressings and gauze pads, bandages and adhesive plasters, medical tape, a triangular bandage, disposable gloves, scissors, antiseptic wipes, a cold pack, a torch, a list of personal medicines and emergency numbers. Check it regularly and replace used or expired items.\n' +
      '**Family plan:** agree who checks in, who calls whom, and what to do if someone does not answer.',
    sources: [SOURCES.RED_CROSS, SOURCES.NHS_FIRST_AID],
  },
  {
    id: 'prep-living-alone',
    category: 'preparedness',
    title: 'Staying safe when living alone / not relying only on automatic detection',
    keywords: ['living alone', 'live alone', 'alone', 'elderly living alone', 'rely on automatic', 'not rely', 'only on fall detection', 'check in', 'pendant', 'wearable'],
    content:
      '- Keep a **phone within reach** (or wear a personal alarm) at all times, including in the bedroom and bathroom.\n' +
      '- Set up a **daily check-in** with a family member or neighbour, and give a trusted person a spare key.\n' +
      '- Keep emergency numbers visible; make sure family know your medicines and conditions.\n' +
      '- Make the home safer (lighting, rugs, grab bars) and keep up your balance exercises.\n' +
      '- **Do not rely only on automatic fall detection.** Any such system, including SafeWalk, can miss falls (hidden by furniture, out of camera view, device off) and can raise false alarms. Use it as one layer next to the steps above.',
    sources: [SOURCES.WHO_FALLS, SOURCES.SAFEWALK],
  },
]

// ---------------------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------------------

const STOP = new Set([
  'the','a','an','and','or','of','to','in','on','is','are','was','were','do','does','did','i','my','me','we','you','it','if','what','how','should','can','that','this','with','for','at','be','have','has','they','them','their','he','she','his','her','someone','person','there','when','will','not'
])

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
}

/** Score = phrase matches (strong) + shared words (weak). */
function score(query: string, entry: KbEntry): number {
  const q = query.toLowerCase()
  const qTokens = new Set(tokens(q))
  let s = 0
  for (const kw of entry.keywords) {
    if (q.includes(kw)) s += 4 + kw.split(' ').length // longer phrases = more specific
  }
  const entryTokens = new Set(tokens(entry.title + ' ' + entry.keywords.join(' ')))
  for (const t of qTokens) if (entryTokens.has(t)) s += 1
  return s
}

export function searchKnowledgeBase(query: string, limit = 3): { entry: KbEntry; score: number }[] {
  return KNOWLEDGE_BASE.map((entry) => ({ entry, score: score(query, entry) }))
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export const SUGGESTED_TOPICS = [
  'What should I do if someone falls?',
  'How can I prevent falls at home?',
  'What should I do if someone is unconscious?',
  'How does SafeWalk detect falls?',
  'How do I configure emergency contacts?',
]

/** Compact facts about the real implementation, placed in the LLM system prompt. */
export const APP_FACTS = `
SafeWalk – AI-Powered Fall Detection and Emergency Response System (prototype, not a medical device).
ACTUAL FEATURES:
- Web app: React + Vite + TypeScript + Tailwind. Backend: Node.js + Express + TypeScript. Database: PostgreSQL via Prisma. Auth: JWT + bcrypt.
- Fall detection: webcam → MediaPipe Pose Landmarker (runs locally in the browser, video never uploaded) → custom TypeScript algorithm using torso angle, sudden hip drop/speed, torso tilt increase, persistence of a horizontal posture across frames, and a short history. Thresholds are adjustable; Settings has Low/Medium/High sensitivity.
- Monitoring states: Idle, Initializing Camera, Detecting Person, Monitoring, Possible Fall Detected, Fall Confirmation Countdown, Fall Confirmed, Alert Sent, Error.
- When a possible fall is found a countdown (default 10 s, configurable 5-60 s) starts with an "I'm Safe – Cancel Alert" button. Cancelling records a cancelled event and sends nothing. If it expires, the event is stored in PostgreSQL and an e-mail goes to the PRIMARY emergency contact. Duplicate events/e-mails are prevented.
- Pages: Landing, Register, Login, Dashboard, Monitoring, Emergency Contacts, Fall History (with filters and Resend alert), Alerts (e-mail history with status), Settings, Detection Test Lab (synthetic tests; sends nothing).
- Optional location in the e-mail only if the user enabled location sharing. Settings has a "Send test email" button that e-mails the user's own address.
- The e-mail status shown is real: "sent" means the mail server accepted the message, "failed" means it did not. "sent" does not prove the e-mail was read.
LIMITATIONS: only works while the page is open and the device is awake (no 24/7 background monitoring); not medically validated; accuracy varies with camera position, lighting, visibility, distance, clothing and occlusion; it can miss falls and raise false alarms; it does NOT contact ambulances or emergency services; the chatbot cannot send e-mails, change settings or see the user's data.
NOT IMPLEMENTED (never claim these): SMS/text messages, phone/voice calls, ambulance dispatch, mobile apps, multi-camera, wearable sensors, background/closed-browser monitoring, e-mailing several contacts at once, password reset by e-mail, chat history storage.
`.trim()
