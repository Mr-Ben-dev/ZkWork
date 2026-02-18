import credits.aleo;
import test_usdcx_stablecoin.aleo;

program zkwork_private_v1.aleo {

    // ================================================================
    //                        RECORD TYPES
    // ================================================================

    record WorkerProfile {
        owner: address,
        profile_id: field,
        skills_hash: field,
        bio_hash: field,
        nonce_seed: field
    }

    record JobOffer {
        owner: address,
        job_id: field,
        description_hash: field,
        salary: u64,
        payment_type: u8,
        category_hash: field,
        deadline_blocks: u64,
        nonce_seed: field
    }

    record Agreement {
        owner: address,
        agreement_id: field,
        job_id: field,
        worker: address,
        client: address,
        salary: u64,
        payment_type: u8,
        description_hash: field,
        nonce_seed: field
    }

    record EscrowReceipt {
        owner: address,
        agreement_id: field,
        amount: u64,
        worker: address,
        payment_type: u8,
        escrow_commitment: field,
        nonce_seed: field
    }

    record DeliveryNotice {
        owner: address,
        agreement_id: field,
        deliverable_hash: field,
        worker: address,
        nonce_seed: field
    }

    record CompletionReceipt {
        owner: address,
        agreement_id: field,
        deliverable_hash: field,
        salary: u64,
        nonce_seed: field
    }

    record ReputationRecord {
        owner: address,
        score: u64,
        completed_jobs: u64,
        rep_commitment: field,
        nonce_seed: field
    }

    record ThresholdProof {
        owner: address,
        worker_commitment: field,
        threshold: u64,
        verified: bool,
        nonce_seed: field
    }

    // ================================================================
    //                     EXTERNAL STRUCTS
    // ================================================================

    struct MerkleProof {
        siblings: [field; 16],
        leaf_index: u32
    }

    // ================================================================
    //           PUBLIC MAPPINGS — 6 total (minimal footprint)
    // ================================================================

    mapping job_exists: field => bool;
    mapping agreement_active: field => bool;
    mapping escrow_active: field => bool;
    mapping delivery_submitted: field => bool;
    mapping escrow_timestamps: field => u64;
    mapping reputation_exists: field => bool;

    // ================================================================
    //                       CONSTRUCTOR
    // ================================================================

    @noupgrade
    async constructor() {}

    // ================================================================
    //               WORKER SELF-REGISTRATION
    // ================================================================

    transition register_worker(
        skills_hash: field,
        bio_hash: field,
        salt: field
    ) -> WorkerProfile {
        let profile_id: field = BHP256::hash_to_field(
            self.signer as field + skills_hash + salt
        );
        let nonce: field = BHP256::hash_to_field(profile_id + bio_hash);

        let profile: WorkerProfile = WorkerProfile {
            owner: self.signer,
            profile_id: profile_id,
            skills_hash: skills_hash,
            bio_hash: bio_hash,
            nonce_seed: nonce
        };

        return profile;
    }

    // ================================================================
    //                    JOB MANAGEMENT
    // ================================================================

    async transition post_job(
        description_hash: field,
        salary: u64,
        payment_type: u8,
        category_hash: field,
        deadline_blocks: u64,
        salt: field
    ) -> (JobOffer, Future) {
        assert(payment_type == 0u8 || payment_type == 1u8);
        assert(salary > 0u64);

        let job_id: field = BHP256::hash_to_field(
            self.signer as field + description_hash + salt
        );
        let nonce: field = BHP256::hash_to_field(job_id + salary as field);

        let job: JobOffer = JobOffer {
            owner: self.signer,
            job_id: job_id,
            description_hash: description_hash,
            salary: salary,
            payment_type: payment_type,
            category_hash: category_hash,
            deadline_blocks: deadline_blocks,
            nonce_seed: nonce
        };

        let job_commitment: field = BHP256::hash_to_field(job_id);
        let f: Future = finalize_post_job(job_commitment);
        return (job, f);
    }

    async function finalize_post_job(job_commitment: field) {
        let exists: bool = Mapping::get_or_use(job_exists, job_commitment, false);
        assert(!exists);
        Mapping::set(job_exists, job_commitment, true);
    }

    async transition cancel_job(job: JobOffer) -> Future {
        assert_eq(job.owner, self.signer);
        let job_commitment: field = BHP256::hash_to_field(job.job_id);
        let f: Future = finalize_cancel_job(job_commitment);
        return f;
    }

    async function finalize_cancel_job(job_commitment: field) {
        let exists: bool = Mapping::get_or_use(job_exists, job_commitment, false);
        assert(exists);
        Mapping::set(job_exists, job_commitment, false);
    }

    // ================================================================
    //              AGREEMENT CREATION
    // ================================================================

    async transition create_agreement(
        job: JobOffer,
        worker: address,
        salt: field
    ) -> (Agreement, Agreement, Future) {
        assert_eq(job.owner, self.signer);

        let agreement_id: field = BHP256::hash_to_field(
            job.job_id + worker as field + salt
        );
        let nonce_client: field = BHP256::hash_to_field(agreement_id + self.signer as field);
        let nonce_worker: field = BHP256::hash_to_field(agreement_id + worker as field);

        let client_copy: Agreement = Agreement {
            owner: self.signer,
            agreement_id: agreement_id,
            job_id: job.job_id,
            worker: worker,
            client: self.signer,
            salary: job.salary,
            payment_type: job.payment_type,
            description_hash: job.description_hash,
            nonce_seed: nonce_client
        };

        let worker_copy: Agreement = Agreement {
            owner: worker,
            agreement_id: agreement_id,
            job_id: job.job_id,
            worker: worker,
            client: self.signer,
            salary: job.salary,
            payment_type: job.payment_type,
            description_hash: job.description_hash,
            nonce_seed: nonce_worker
        };

        let job_commitment: field = BHP256::hash_to_field(job.job_id);
        let agreement_commitment: field = BHP256::hash_to_field(agreement_id);
        let f: Future = finalize_create_agreement(job_commitment, agreement_commitment);
        return (client_copy, worker_copy, f);
    }

    async function finalize_create_agreement(
        job_commitment: field,
        agreement_commitment: field
    ) {
        let job_ok: bool = Mapping::get_or_use(job_exists, job_commitment, false);
        assert(job_ok);
        let existing: bool = Mapping::get_or_use(agreement_active, agreement_commitment, false);
        assert(!existing);
        Mapping::set(job_exists, job_commitment, false);
        Mapping::set(agreement_active, agreement_commitment, true);
    }

    // ================================================================
    //             ALEO CREDITS ESCROW (lock → release → refund)
    // ================================================================

    async transition deposit_escrow_aleo(
        agreement: Agreement,
        pay_record: credits.aleo/credits,
        amount: u64
    ) -> (Agreement, EscrowReceipt, credits.aleo/credits, Future) {
        assert_eq(agreement.owner, self.signer);
        assert_eq(agreement.client, self.signer);
        assert_eq(agreement.payment_type, 0u8);
        assert_eq(amount, agreement.salary);

        let (change, transfer_f): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(pay_record, self.address, amount);

        let agreement_commitment: field = BHP256::hash_to_field(agreement.agreement_id);
        let escrow_commitment: field = BHP256::hash_to_field(
            agreement.agreement_id + amount as field
        );
        let nonce: field = BHP256::hash_to_field(escrow_commitment + self.signer as field);

        let receipt: EscrowReceipt = EscrowReceipt {
            owner: self.signer,
            agreement_id: agreement.agreement_id,
            amount: amount,
            worker: agreement.worker,
            payment_type: 0u8,
            escrow_commitment: escrow_commitment,
            nonce_seed: nonce
        };

        let updated_agreement: Agreement = Agreement {
            owner: self.signer,
            agreement_id: agreement.agreement_id,
            job_id: agreement.job_id,
            worker: agreement.worker,
            client: agreement.client,
            salary: agreement.salary,
            payment_type: agreement.payment_type,
            description_hash: agreement.description_hash,
            nonce_seed: BHP256::hash_to_field(agreement.nonce_seed + 1field)
        };

        let f: Future = finalize_deposit_escrow(transfer_f, agreement_commitment);
        return (updated_agreement, receipt, change, f);
    }

    async function finalize_deposit_escrow(
        transfer_f: Future,
        agreement_commitment: field
    ) {
        transfer_f.await();
        let active: bool = Mapping::get_or_use(agreement_active, agreement_commitment, false);
        assert(active);
        let existing_escrow: bool = Mapping::get_or_use(escrow_active, agreement_commitment, false);
        assert(!existing_escrow);
        Mapping::set(escrow_active, agreement_commitment, true);
        Mapping::set(escrow_timestamps, agreement_commitment, block.height as u64);
    }

    // ================================================================
    //              DELIVERABLE SUBMISSION
    // ================================================================

    async transition submit_deliverable(
        agreement: Agreement,
        deliverable_hash: field
    ) -> (Agreement, DeliveryNotice, Future) {
        assert_eq(agreement.owner, self.signer);
        assert_eq(agreement.worker, self.signer);

        let updated: Agreement = Agreement {
            owner: self.signer,
            agreement_id: agreement.agreement_id,
            job_id: agreement.job_id,
            worker: agreement.worker,
            client: agreement.client,
            salary: agreement.salary,
            payment_type: agreement.payment_type,
            description_hash: agreement.description_hash,
            nonce_seed: BHP256::hash_to_field(agreement.nonce_seed + 2field)
        };

        let nonce: field = BHP256::hash_to_field(deliverable_hash + agreement.agreement_id);
        let notice: DeliveryNotice = DeliveryNotice {
            owner: agreement.client,
            agreement_id: agreement.agreement_id,
            deliverable_hash: deliverable_hash,
            worker: agreement.worker,
            nonce_seed: nonce
        };

        let agreement_commitment: field = BHP256::hash_to_field(agreement.agreement_id);
        let f: Future = finalize_submit_deliverable(agreement_commitment);
        return (updated, notice, f);
    }

    async function finalize_submit_deliverable(agreement_commitment: field) {
        let active: bool = Mapping::get_or_use(agreement_active, agreement_commitment, false);
        assert(active);
        let existing: bool = Mapping::get_or_use(delivery_submitted, agreement_commitment, false);
        assert(!existing);
        Mapping::set(delivery_submitted, agreement_commitment, true);
    }

    // ================================================================
    //      COMPLETE JOB (ALEO) — ATOMIC: release escrow + receipts
    // ================================================================

    async transition complete_job_aleo(
        agreement: Agreement,
        escrow: EscrowReceipt,
        notice: DeliveryNotice
    ) -> (CompletionReceipt, CompletionReceipt, credits.aleo/credits, Future) {
        assert_eq(agreement.owner, self.signer);
        assert_eq(agreement.client, self.signer);
        assert_eq(escrow.owner, self.signer);
        assert_eq(notice.owner, self.signer);
        assert_eq(escrow.payment_type, 0u8);
        assert_eq(agreement.agreement_id, escrow.agreement_id);
        assert_eq(agreement.agreement_id, notice.agreement_id);

        let (worker_credits, transfer_f): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(escrow.worker, escrow.amount);

        let nonce_client: field = BHP256::hash_to_field(
            agreement.agreement_id + self.signer as field + 3field
        );
        let nonce_worker: field = BHP256::hash_to_field(
            agreement.agreement_id + escrow.worker as field + 3field
        );

        let client_receipt: CompletionReceipt = CompletionReceipt {
            owner: self.signer,
            agreement_id: agreement.agreement_id,
            deliverable_hash: notice.deliverable_hash,
            salary: escrow.amount,
            nonce_seed: nonce_client
        };

        let worker_receipt: CompletionReceipt = CompletionReceipt {
            owner: escrow.worker,
            agreement_id: agreement.agreement_id,
            deliverable_hash: notice.deliverable_hash,
            salary: escrow.amount,
            nonce_seed: nonce_worker
        };

        let agreement_commitment: field = BHP256::hash_to_field(agreement.agreement_id);
        let f: Future = finalize_complete_job_aleo(transfer_f, agreement_commitment);
        return (client_receipt, worker_receipt, worker_credits, f);
    }

    async function finalize_complete_job_aleo(
        transfer_f: Future,
        agreement_commitment: field
    ) {
        let active: bool = Mapping::get_or_use(agreement_active, agreement_commitment, false);
        assert(active);
        let escrowed: bool = Mapping::get_or_use(escrow_active, agreement_commitment, false);
        assert(escrowed);
        let delivered: bool = Mapping::get_or_use(delivery_submitted, agreement_commitment, false);
        assert(delivered);
        transfer_f.await();
        Mapping::set(agreement_active, agreement_commitment, false);
        Mapping::set(escrow_active, agreement_commitment, false);
        Mapping::set(delivery_submitted, agreement_commitment, false);
        Mapping::set(escrow_timestamps, agreement_commitment, 0u64);
    }

    // ================================================================
    //          REFUND ESCROW (ALEO) — after 1000 block timeout
    // ================================================================

    async transition refund_escrow_aleo(
        escrow: EscrowReceipt
    ) -> (credits.aleo/credits, Future) {
        assert_eq(escrow.owner, self.signer);
        assert_eq(escrow.payment_type, 0u8);

        let (buyer_credits, transfer_f): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(self.signer, escrow.amount);

        let agreement_commitment: field = BHP256::hash_to_field(escrow.agreement_id);
        let f: Future = finalize_refund_escrow(transfer_f, agreement_commitment);
        return (buyer_credits, f);
    }

    async function finalize_refund_escrow(
        transfer_f: Future,
        agreement_commitment: field
    ) {
        let escrowed: bool = Mapping::get_or_use(escrow_active, agreement_commitment, false);
        assert(escrowed);
        let created_at: u64 = Mapping::get(escrow_timestamps, agreement_commitment);
        assert(created_at > 0u64);
        assert((block.height as u64) >= created_at + 1000u64);
        transfer_f.await();
        Mapping::set(escrow_active, agreement_commitment, false);
        Mapping::set(escrow_timestamps, agreement_commitment, 0u64);
    }

    // ================================================================
    //        USDCx ESCROW COMMITMENT (signal-only, no token lock)
    // ================================================================

    async transition commit_escrow_usdcx(
        agreement: Agreement
    ) -> (Agreement, EscrowReceipt, Future) {
        assert_eq(agreement.owner, self.signer);
        assert_eq(agreement.client, self.signer);
        assert_eq(agreement.payment_type, 1u8);

        let agreement_commitment: field = BHP256::hash_to_field(agreement.agreement_id);
        let escrow_commitment: field = BHP256::hash_to_field(
            agreement.agreement_id + agreement.salary as field
        );
        let nonce: field = BHP256::hash_to_field(escrow_commitment + self.signer as field);

        let receipt: EscrowReceipt = EscrowReceipt {
            owner: self.signer,
            agreement_id: agreement.agreement_id,
            amount: agreement.salary,
            worker: agreement.worker,
            payment_type: 1u8,
            escrow_commitment: escrow_commitment,
            nonce_seed: nonce
        };

        let updated_agreement: Agreement = Agreement {
            owner: self.signer,
            agreement_id: agreement.agreement_id,
            job_id: agreement.job_id,
            worker: agreement.worker,
            client: agreement.client,
            salary: agreement.salary,
            payment_type: agreement.payment_type,
            description_hash: agreement.description_hash,
            nonce_seed: BHP256::hash_to_field(agreement.nonce_seed + 1field)
        };

        let f: Future = finalize_commit_escrow_usdcx(agreement_commitment);
        return (updated_agreement, receipt, f);
    }

    async function finalize_commit_escrow_usdcx(agreement_commitment: field) {
        let active: bool = Mapping::get_or_use(agreement_active, agreement_commitment, false);
        assert(active);
        let existing: bool = Mapping::get_or_use(escrow_active, agreement_commitment, false);
        assert(!existing);
        Mapping::set(escrow_active, agreement_commitment, true);
        Mapping::set(escrow_timestamps, agreement_commitment, block.height as u64);
    }

    // ================================================================
    //    COMPLETE JOB (USDCx) — ATOMIC: payment + completion receipts
    // ================================================================

    async transition complete_job_usdcx(
        agreement: Agreement,
        escrow: EscrowReceipt,
        notice: DeliveryNotice,
        pay_record: test_usdcx_stablecoin.aleo/Token,
        amount: u128,
        private proofs: [MerkleProof; 2]
    ) -> (CompletionReceipt, CompletionReceipt, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, Future) {
        assert_eq(agreement.owner, self.signer);
        assert_eq(agreement.client, self.signer);
        assert_eq(escrow.owner, self.signer);
        assert_eq(notice.owner, self.signer);
        assert_eq(escrow.payment_type, 1u8);
        assert_eq(agreement.agreement_id, escrow.agreement_id);
        assert_eq(agreement.agreement_id, notice.agreement_id);

        let (compliance, token_worker, token_change, transfer_f): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            test_usdcx_stablecoin.aleo/Token,
            Future
        ) = test_usdcx_stablecoin.aleo/transfer_private(escrow.worker, amount, pay_record, proofs);

        let nonce_client: field = BHP256::hash_to_field(
            agreement.agreement_id + self.signer as field + 4field
        );
        let nonce_worker: field = BHP256::hash_to_field(
            agreement.agreement_id + escrow.worker as field + 4field
        );

        let client_receipt: CompletionReceipt = CompletionReceipt {
            owner: self.signer,
            agreement_id: agreement.agreement_id,
            deliverable_hash: notice.deliverable_hash,
            salary: amount as u64,
            nonce_seed: nonce_client
        };

        let worker_receipt: CompletionReceipt = CompletionReceipt {
            owner: escrow.worker,
            agreement_id: agreement.agreement_id,
            deliverable_hash: notice.deliverable_hash,
            salary: amount as u64,
            nonce_seed: nonce_worker
        };

        let agreement_commitment: field = BHP256::hash_to_field(agreement.agreement_id);
        let f: Future = finalize_complete_job_usdcx(transfer_f, agreement_commitment);
        return (client_receipt, worker_receipt, token_worker, token_change, compliance, f);
    }

    async function finalize_complete_job_usdcx(
        transfer_f: Future,
        agreement_commitment: field
    ) {
        let active: bool = Mapping::get_or_use(agreement_active, agreement_commitment, false);
        assert(active);
        let escrowed: bool = Mapping::get_or_use(escrow_active, agreement_commitment, false);
        assert(escrowed);
        let delivered: bool = Mapping::get_or_use(delivery_submitted, agreement_commitment, false);
        assert(delivered);
        transfer_f.await();
        Mapping::set(agreement_active, agreement_commitment, false);
        Mapping::set(escrow_active, agreement_commitment, false);
        Mapping::set(delivery_submitted, agreement_commitment, false);
        Mapping::set(escrow_timestamps, agreement_commitment, 0u64);
    }

    // ================================================================
    //          CANCEL USDCx ESCROW (no funds locked)
    // ================================================================

    async transition cancel_escrow_usdcx(
        escrow: EscrowReceipt
    ) -> Future {
        assert_eq(escrow.owner, self.signer);
        assert_eq(escrow.payment_type, 1u8);
        let agreement_commitment: field = BHP256::hash_to_field(escrow.agreement_id);
        let f: Future = finalize_cancel_escrow_usdcx(agreement_commitment);
        return f;
    }

    async function finalize_cancel_escrow_usdcx(agreement_commitment: field) {
        let escrowed: bool = Mapping::get_or_use(escrow_active, agreement_commitment, false);
        assert(escrowed);
        Mapping::set(escrow_active, agreement_commitment, false);
        Mapping::set(escrow_timestamps, agreement_commitment, 0u64);
    }

    // ================================================================
    //     REPUTATION — claim, merge, prove threshold (2-step system)
    // ================================================================

    async transition claim_reputation(
        receipt: CompletionReceipt
    ) -> (ReputationRecord, Future) {
        assert_eq(receipt.owner, self.signer);

        let rep_commitment: field = BHP256::hash_to_field(self.signer as field + 1field);
        let nonce: field = BHP256::hash_to_field(rep_commitment + receipt.agreement_id);

        let rep: ReputationRecord = ReputationRecord {
            owner: self.signer,
            score: 1u64,
            completed_jobs: 1u64,
            rep_commitment: rep_commitment,
            nonce_seed: nonce
        };

        let f: Future = finalize_claim_reputation(rep_commitment);
        return (rep, f);
    }

    async function finalize_claim_reputation(rep_commitment: field) {
        Mapping::set(reputation_exists, rep_commitment, true);
    }

    async transition merge_reputation(
        receipt: CompletionReceipt,
        existing: ReputationRecord
    ) -> (ReputationRecord, Future) {
        assert_eq(receipt.owner, self.signer);
        assert_eq(existing.owner, self.signer);

        let new_score: u64 = existing.score + 1u64;
        let new_jobs: u64 = existing.completed_jobs + 1u64;
        let new_commitment: field = BHP256::hash_to_field(
            self.signer as field + new_score as field
        );
        let nonce: field = BHP256::hash_to_field(new_commitment + receipt.agreement_id);

        let rep: ReputationRecord = ReputationRecord {
            owner: self.signer,
            score: new_score,
            completed_jobs: new_jobs,
            rep_commitment: new_commitment,
            nonce_seed: nonce
        };

        let old_commitment: field = existing.rep_commitment;
        let f: Future = finalize_merge_reputation(old_commitment, new_commitment);
        return (rep, f);
    }

    async function finalize_merge_reputation(
        old_commitment: field,
        new_commitment: field
    ) {
        let exists: bool = Mapping::get_or_use(reputation_exists, old_commitment, false);
        assert(exists);
        Mapping::set(reputation_exists, old_commitment, false);
        Mapping::set(reputation_exists, new_commitment, true);
    }

    async transition prove_threshold(
        rep: ReputationRecord,
        threshold: u64,
        verifier: address
    ) -> (ReputationRecord, ThresholdProof, Future) {
        assert_eq(rep.owner, self.signer);
        assert(rep.score >= threshold);

        let worker_commitment: field = BHP256::hash_to_field(
            self.signer as field + rep.score as field
        );
        let nonce_proof: field = BHP256::hash_to_field(
            worker_commitment + threshold as field + verifier as field
        );

        let proof: ThresholdProof = ThresholdProof {
            owner: verifier,
            worker_commitment: worker_commitment,
            threshold: threshold,
            verified: true,
            nonce_seed: nonce_proof
        };

        let updated_rep: ReputationRecord = ReputationRecord {
            owner: self.signer,
            score: rep.score,
            completed_jobs: rep.completed_jobs,
            rep_commitment: rep.rep_commitment,
            nonce_seed: BHP256::hash_to_field(rep.nonce_seed + 1field)
        };

        let f: Future = finalize_prove_threshold(rep.rep_commitment);
        return (updated_rep, proof, f);
    }

    async function finalize_prove_threshold(rep_commitment: field) {
        let exists: bool = Mapping::get_or_use(reputation_exists, rep_commitment, false);
        assert(exists);
    }
}
