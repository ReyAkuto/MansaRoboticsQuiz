/**
 * MansaRoboticsQuiz - 3D Interactive Robotics Companion (MansaBot-X1)
 * High-performance procedural Three.js companion with kinetic tracking,
 * tactile reactions, particle dynamics, and touch/mouse interaction.
 */

(function () {
  'use strict';

  class MansaRobot3D {
    constructor(containerId = 'robot-canvas-container') {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.robotGroup = null;
      this.headGroup = null;
      this.gyroRing1 = null;
      this.gyroRing2 = null;
      this.coreOrb = null;
      this.eyeLeft = null;
      this.eyeRight = null;
      this.shieldMesh = null;
      this.particles = null;

      this.mouseX = 0;
      this.mouseY = 0;
      this.targetRotY = 0;
      this.targetRotX = 0;
      this.isDragging = false;
      this.previousMousePosition = { x: 0, y: 0 };
      this.manualRotX = 0;
      this.manualRotY = 0;

      this.isPaused = false;
      this.clock = null;
      this.state = 'idle'; // 'idle', 'correct', 'wrong', 'streak', 'attack'
      this.stateTimer = 0;
      this.baseCoreColor = 0x00f0ff;
      this.currentCoreColor = new THREE.Color(0x00f0ff);
      this.targetCoreColor = new THREE.Color(0x00f0ff);

      this.init();
    }

    init() {
      if (typeof THREE === 'undefined') {
        console.warn('[MansaRobot3D] Three.js not loaded. Skipping 3D companion.');
        return;
      }

      this.clock = new THREE.Clock();

      // Scene setup
      this.scene = new THREE.Scene();

      // Camera setup
      const width = this.container.clientWidth || 320;
      const height = this.container.clientHeight || 320;
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      this.camera.position.set(0, 0, 5.2);

      // Renderer setup
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.domElement.setAttribute('role', 'img');
      this.renderer.domElement.setAttribute('aria-label', '3D Robot Companion MansaBot');
      this.renderer.domElement.style.outline = 'none';
      this.renderer.domElement.style.cursor = 'grab';
      this.container.appendChild(this.renderer.domElement);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0x00f0ff, 1.8);
      keyLight.position.set(5, 6, 4);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xffaa00, 1.2);
      fillLight.position.set(-5, -3, -3);
      this.scene.add(fillLight);

      const rimLight = new THREE.PointLight(0x38bdf8, 2.5, 10);
      rimLight.position.set(0, 3, -2);
      this.scene.add(rimLight);

      // Build Procedural Robot
      this.buildRobot();

      // Build Particle Field
      this.buildParticles();

      // Event Listeners
      this.bindEvents();

      // Start Animation Loop
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    buildRobot() {
      this.robotGroup = new THREE.Group();
      this.scene.add(this.robotGroup);

      // Materials
      const chassisMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: false
      });

      const accentMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.9,
        roughness: 0.3
      });

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.2
      });

      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x030712,
        roughness: 0.1,
        metalness: 0.95,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });

      const coreGlowMat = new THREE.MeshBasicMaterial({
        color: this.baseCoreColor
      });

      // 1. Robot Head/Chassis
      this.headGroup = new THREE.Group();
      this.robotGroup.add(this.headGroup);

      const headGeo = new THREE.SphereGeometry(1.0, 32, 24);
      // Flatten bottom slightly for robotic aerodynamic helmet look
      const headMesh = new THREE.Mesh(headGeo, chassisMat);
      this.headGroup.add(headMesh);

      // Visor
      const visorGeo = new THREE.SphereGeometry(0.92, 32, 16, 0, Math.PI, Math.PI * 0.28, Math.PI * 0.44);
      const visorMesh = new THREE.Mesh(visorGeo, visorMat);
      visorMesh.rotation.y = -Math.PI / 2;
      visorMesh.position.set(0, 0.08, 0.18);
      this.headGroup.add(visorMesh);

      // Dual Eye Displays (LED Rings inside visor)
      const eyeGeo = new THREE.RingGeometry(0.06, 0.12, 16);
      const eyeMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide
      });

      this.eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
      this.eyeLeft.position.set(-0.35, 0.15, 1.02);
      this.headGroup.add(this.eyeLeft);

      this.eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
      this.eyeRight.position.set(0.35, 0.15, 1.02);
      this.headGroup.add(this.eyeRight);

      // Sensor Antennas (Left & Right)
      const earGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.35, 16);
      const earLeft = new THREE.Mesh(earGeo, goldMat);
      earLeft.rotation.z = Math.PI / 2;
      earLeft.position.set(-1.05, 0.1, 0);
      this.headGroup.add(earLeft);

      const earRight = new THREE.Mesh(earGeo, goldMat);
      earRight.rotation.z = -Math.PI / 2;
      earRight.position.set(1.05, 0.1, 0);
      this.headGroup.add(earRight);

      // Antenna Rods with Glowing Tips
      const rodGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 8);
      const antLeft = new THREE.Mesh(rodGeo, accentMat);
      antLeft.position.set(-1.18, 0.45, 0);
      antLeft.rotation.z = 0.35;
      this.headGroup.add(antLeft);

      const antRight = new THREE.Mesh(rodGeo, accentMat);
      antRight.position.set(1.18, 0.45, 0);
      antRight.rotation.z = -0.35;
      this.headGroup.add(antRight);

      const tipGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const tipLeft = new THREE.Mesh(tipGeo, eyeMat);
      tipLeft.position.set(-1.27, 0.72, 0);
      this.headGroup.add(tipLeft);

      const tipRight = new THREE.Mesh(tipGeo, eyeMat);
      tipRight.position.set(1.27, 0.72, 0);
      this.headGroup.add(tipRight);

      // 2. Center Energy Reactor Core
      const coreGeo = new THREE.IcosahedronGeometry(0.28, 2);
      this.coreOrb = new THREE.Mesh(coreGeo, coreGlowMat);
      this.coreOrb.position.set(0, -0.65, 0.5);
      this.headGroup.add(this.coreOrb);

      // Core Housing Ring
      const coreRingGeo = new THREE.TorusGeometry(0.36, 0.04, 16, 32);
      const coreRing = new THREE.Mesh(coreRingGeo, goldMat);
      coreRing.position.set(0, -0.65, 0.5);
      this.headGroup.add(coreRing);

      // 3. Floating Orbital Gyro Rings
      const ring1Geo = new THREE.TorusGeometry(1.48, 0.035, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.9,
        roughness: 0.25
      });
      this.gyroRing1 = new THREE.Mesh(ring1Geo, ringMat);
      this.gyroRing1.rotation.x = Math.PI / 3;
      this.robotGroup.add(this.gyroRing1);

      const ring2Geo = new THREE.TorusGeometry(1.68, 0.025, 16, 64);
      this.gyroRing2 = new THREE.Mesh(ring2Geo, ringMat);
      this.gyroRing2.rotation.y = Math.PI / 4;
      this.gyroRing2.rotation.x = -Math.PI / 5;
      this.robotGroup.add(this.gyroRing2);

      // 4. Forcefield Energy Shield (Hidden by default)
      const shieldGeo = new THREE.IcosahedronGeometry(1.85, 2);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0
      });
      this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      this.robotGroup.add(this.shieldMesh);
    }

    buildParticles() {
      const particleCount = 45;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 6;
        positions[i + 1] = (Math.random() - 0.5) * 6;
        positions[i + 2] = (Math.random() - 0.5) * 4;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.045,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });

      this.particles = new THREE.Points(geometry, material);
      this.scene.add(this.particles);
    }

    bindEvents() {
      // Mouse Move Tracking
      window.addEventListener('mousemove', e => {
        if (this.isDragging) return;
        const normX = (e.clientX / window.innerWidth) * 2 - 1;
        const normY = -(e.clientY / window.innerHeight) * 2 + 1;
        this.targetRotY = normX * 0.45;
        this.targetRotX = -normY * 0.35;
      });

      // Canvas Drag to Rotate
      const dom = this.renderer.domElement;

      dom.addEventListener('mousedown', e => {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        dom.style.cursor = 'grabbing';
      });

      window.addEventListener('mouseup', () => {
        if (this.isDragging) {
          this.isDragging = false;
          dom.style.cursor = 'grab';
        }
      });

      window.addEventListener('mousemove', e => {
        if (!this.isDragging) return;
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.manualRotY += deltaX * 0.008;
        this.manualRotX += deltaY * 0.008;
        this.manualRotX = Math.max(-0.6, Math.min(0.6, this.manualRotX));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      });

      // Touch Interactions for Mobile
      dom.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      }, { passive: true });

      window.addEventListener('touchend', () => {
        this.isDragging = false;
      });

      window.addEventListener('touchmove', e => {
        if (!this.isDragging || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

        this.manualRotY += deltaX * 0.008;
        this.manualRotX += deltaY * 0.008;
        this.manualRotX = Math.max(-0.6, Math.min(0.6, this.manualRotX));

        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }, { passive: true });

      // Click for Fun Interaction
      dom.addEventListener('click', () => {
        this.triggerSalute();
      });

      // Resize Listener
      window.addEventListener('resize', () => {
        if (!this.container || !this.renderer || !this.camera) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w === 0 || h === 0) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      });
    }

    triggerSalute() {
      if (this.state !== 'idle') return;
      this.state = 'salute';
      this.stateTimer = 0.8;
      this.targetCoreColor.setHex(0xf59e0b);
    }

    triggerCorrect() {
      this.state = 'correct';
      this.stateTimer = 1.6;
      this.targetCoreColor.setHex(0x10b981); // Bright Green
    }

    triggerWrong() {
      this.state = 'wrong';
      this.stateTimer = 1.4;
      this.targetCoreColor.setHex(0xef4444); // Red Warning
    }

    triggerStreak(count = 3) {
      this.state = 'streak';
      this.stateTimer = 2.0;
      this.targetCoreColor.setHex(0xf59e0b); // Gold Overdrive
    }

    triggerShield(active = true) {
      if (!this.shieldMesh) return;
      if (active) {
        this.shieldMesh.material.opacity = 0.75;
        this.shieldMesh.material.color.setHex(0x38bdf8);
      } else {
        this.shieldMesh.material.opacity = 0;
      }
    }

    triggerAttack() {
      this.state = 'attack';
      this.stateTimer = 1.2;
      this.targetCoreColor.setHex(0xf43f5e);
    }

    animate() {
      requestAnimationFrame(this.animate);
      if (this.isPaused) return;

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();

      // Core Color Interpolation
      this.currentCoreColor.lerp(this.targetCoreColor, 0.08);
      if (this.coreOrb) this.coreOrb.material.color.copy(this.currentCoreColor);
      if (this.eyeLeft) this.eyeLeft.material.color.copy(this.currentCoreColor);
      if (this.eyeRight) this.eyeRight.material.color.copy(this.currentCoreColor);

      // State Timer Decay
      if (this.stateTimer > 0) {
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.targetCoreColor.setHex(this.baseCoreColor);
        }
      }

      // Gyro Rings Rotation
      if (this.gyroRing1) {
        this.gyroRing1.rotation.z += (this.state === 'streak' ? 0.05 : 0.015);
        this.gyroRing1.rotation.y += 0.008;
      }
      if (this.gyroRing2) {
        this.gyroRing2.rotation.z -= (this.state === 'streak' ? 0.06 : 0.02);
        this.gyroRing2.rotation.x += 0.006;
      }

      // Shield pulse
      if (this.shieldMesh && this.shieldMesh.material.opacity > 0) {
        this.shieldMesh.rotation.y += 0.01;
        this.shieldMesh.rotation.x += 0.005;
      }

      // Head / Robot Movement based on State
      if (this.state === 'correct') {
        // Happy Celebration Spin
        this.robotGroup.rotation.y += 0.25;
        this.robotGroup.position.y = Math.sin(time * 8) * 0.25 + 0.15;
      } else if (this.state === 'wrong') {
        // Recoil + Shake head
        this.robotGroup.position.z = -0.4;
        this.robotGroup.position.x = Math.sin(time * 30) * 0.12;
        this.robotGroup.position.y = -0.15;
      } else if (this.state === 'streak') {
        // High Speed Levitation & Pulse
        this.robotGroup.rotation.y += 0.08;
        this.robotGroup.position.y = Math.sin(time * 6) * 0.3;
        this.coreOrb.scale.setScalar(1 + Math.sin(time * 12) * 0.3);
      } else if (this.state === 'salute') {
        // Nodding forward
        this.headGroup.rotation.x = Math.sin(time * 10) * 0.3;
      } else {
        // Idle Organic Levitation
        this.robotGroup.position.y = Math.sin(time * 2.2) * 0.12;
        this.robotGroup.position.x = THREE.MathUtils.lerp(this.robotGroup.position.x, 0, 0.05);
        this.robotGroup.position.z = THREE.MathUtils.lerp(this.robotGroup.position.z, 0, 0.05);

        // Smooth Head Look-At (Tracking Mouse + Manual Drag)
        const targetX = this.targetRotX + this.manualRotX;
        const targetY = this.targetRotY + this.manualRotY;
        this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, targetX, 0.08);
        this.headGroup.rotation.y = THREE.MathUtils.lerp(this.headGroup.rotation.y, targetY, 0.08);

        // Gentle breathing scale on core
        if (this.coreOrb) {
          const breath = 1.0 + Math.sin(time * 3) * 0.08;
          this.coreOrb.scale.set(breath, breath, breath);
        }
      }

      // Ambient Particle Drift
      if (this.particles) {
        this.particles.rotation.y = time * 0.04;
      }

      this.renderer.render(this.scene, this.camera);
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      return this.isPaused;
    }
  }

  // Expose globally
  window.MansaRobot3D = MansaRobot3D;
})();
