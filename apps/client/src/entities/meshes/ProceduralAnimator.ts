import type { HumanoidJoints } from "./HumanoidMeshBuilder.js";
import type { QuadrupedJoints } from "./QuadrupedMeshBuilder.js";

type AnimState = "idle" | "walk" | "attack";

/**
 * Procedural animation for humanoid meshes using sin/cos joint rotation.
 * No Babylon Animation objects — just per-frame joint rotation updates.
 */
export class HumanoidAnimator {
	private t = 0;
	private state: AnimState = "idle";
	private attackTimer = 0;
	private readonly ATTACK_DURATION = 0.4;

	update(dt: number, isMoving: boolean, joints: HumanoidJoints): void {
		this.t += dt;

		if (this.attackTimer > 0) {
			this.attackTimer -= dt;
			this.animateAttack(joints);
			return;
		}

		if (isMoving) {
			this.state = "walk";
		} else {
			this.state = "idle";
		}

		if (this.state === "walk") {
			this.animateWalk(joints);
		} else {
			this.animateIdle(joints);
		}
	}

	triggerAttack(): void {
		this.attackTimer = this.ATTACK_DURATION;
		this.state = "attack";
	}

	private animateIdle(j: HumanoidJoints): void {
		// Gentle torso bob
		j.torso.position.y = 0.65 + Math.sin(this.t * 2) * 0.02;

		// Slight arm sway
		j.leftArmJoint.rotation.x = Math.sin(this.t * 1.5) * 0.05;
		j.rightArmJoint.rotation.x = Math.sin(this.t * 1.5 + 0.5) * 0.05;

		// Reset legs
		j.leftLegJoint.rotation.x = 0;
		j.rightLegJoint.rotation.x = 0;
		j.leftKneeJoint.rotation.x = 0;
		j.rightKneeJoint.rotation.x = 0;
		j.leftElbowJoint.rotation.x = 0;
		j.rightElbowJoint.rotation.x = 0;
	}

	private animateWalk(j: HumanoidJoints): void {
		const t = this.t;

		// Leg swing
		const legSwing = Math.sin(t * 8) * 0.5;
		j.leftLegJoint.rotation.x = legSwing;
		j.rightLegJoint.rotation.x = -legSwing;

		// Knee bend on backstroke
		j.leftKneeJoint.rotation.x = Math.max(0, -legSwing) * 0.6;
		j.rightKneeJoint.rotation.x = Math.max(0, legSwing) * 0.6;

		// Arms swing opposite to legs
		j.leftArmJoint.rotation.x = -legSwing * 0.6;
		j.rightArmJoint.rotation.x = legSwing * 0.6;
		j.leftElbowJoint.rotation.x = -0.2;
		j.rightElbowJoint.rotation.x = -0.2;

		// Torso bounce
		j.torso.position.y = 0.65 + Math.abs(Math.sin(t * 8)) * 0.03;
	}

	private animateAttack(j: HumanoidJoints): void {
		const progress = 1 - this.attackTimer / this.ATTACK_DURATION;

		// Right arm raise then swing
		if (progress < 0.4) {
			// Raise
			const raise = progress / 0.4;
			j.rightArmJoint.rotation.x = -raise * 1.8;
			j.rightElbowJoint.rotation.x = -raise * 0.8;
		} else {
			// Swing down
			const swing = (progress - 0.4) / 0.6;
			j.rightArmJoint.rotation.x = -1.8 + swing * 2.5;
			j.rightElbowJoint.rotation.x = -0.8 + swing * 1.0;
		}

		// Torso twist
		j.torso.rotation.y = Math.sin(progress * Math.PI) * 0.2;

		// Left arm stays still
		j.leftArmJoint.rotation.x = -0.1;
		j.leftElbowJoint.rotation.x = 0;
	}
}

/**
 * Procedural animation for quadruped meshes.
 */
export class QuadrupedAnimator {
	private t = 0;
	private attackTimer = 0;
	private readonly ATTACK_DURATION = 0.2;

	update(dt: number, isMoving: boolean, joints: QuadrupedJoints): void {
		this.t += dt;

		if (this.attackTimer > 0) {
			this.attackTimer -= dt;
			this.animateAttack(joints);
			return;
		}

		if (isMoving) {
			this.animateWalk(joints);
		} else {
			this.animateIdle(joints);
		}
	}

	triggerAttack(): void {
		this.attackTimer = this.ATTACK_DURATION;
	}

	private animateIdle(j: QuadrupedJoints): void {
		// Breathing bob
		j.body.position.y += Math.sin(this.t * 2.5) * 0.005;

		// Tail wag
		j.tailJoint.rotation.y = Math.sin(this.t * 3) * 0.3;

		// Reset legs
		j.frontLeftLeg.rotation.x = 0;
		j.frontRightLeg.rotation.x = 0;
		j.rearLeftLeg.rotation.x = 0;
		j.rearRightLeg.rotation.x = 0;
		j.frontLeftKnee.rotation.x = 0;
		j.frontRightKnee.rotation.x = 0;
		j.rearLeftKnee.rotation.x = 0;
		j.rearRightKnee.rotation.x = 0;

		// Head rest
		j.headJoint.rotation.x = 0;
		j.headJoint.rotation.y = Math.sin(this.t * 0.8) * 0.05;
	}

	private animateWalk(j: QuadrupedJoints): void {
		const t = this.t;
		const swing = 0.4;

		// Diagonal gait: front-left + rear-right together
		const phase1 = Math.sin(t * 7) * swing;
		const phase2 = Math.sin(t * 7 + Math.PI) * swing;

		j.frontLeftLeg.rotation.x = phase1;
		j.rearRightLeg.rotation.x = phase1;
		j.frontRightLeg.rotation.x = phase2;
		j.rearLeftLeg.rotation.x = phase2;

		// Knee bends on backstroke
		j.frontLeftKnee.rotation.x = Math.max(0, -phase1) * 0.5;
		j.rearRightKnee.rotation.x = Math.max(0, -phase1) * 0.5;
		j.frontRightKnee.rotation.x = Math.max(0, -phase2) * 0.5;
		j.rearLeftKnee.rotation.x = Math.max(0, -phase2) * 0.5;

		// Head sway
		j.headJoint.rotation.y = Math.sin(t * 3.5) * 0.08;

		// Tail movement
		j.tailJoint.rotation.y = Math.sin(t * 5) * 0.2;
	}

	private animateAttack(j: QuadrupedJoints): void {
		const progress = 1 - this.attackTimer / this.ATTACK_DURATION;

		// Head lunge forward
		if (progress < 0.5) {
			j.headJoint.rotation.x = -(progress / 0.5) * 0.5;
		} else {
			j.headJoint.rotation.x = -0.5 + ((progress - 0.5) / 0.5) * 0.5;
		}

		// Body dip
		j.body.rotation.x = Math.sin(progress * Math.PI) * -0.1;
	}
}
