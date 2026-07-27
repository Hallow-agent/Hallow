// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Hallow Receipt Registry
/// @notice Records public proof hashes only. It never holds funds, signs transactions,
///         stores prompts, or stores Hallow's private memory.
contract HallowReceiptRegistry {
    struct Receipt {
        bytes32 planHash;
        bytes32 passportHash;
        bytes32 policyHash;
        bytes32 approvalHash;
        address recorder;
        uint64 recordedAt;
    }

    mapping(bytes32 receiptId => Receipt receipt) public receipts;

    event ReceiptRecorded(
        bytes32 indexed receiptId,
        bytes32 indexed planHash,
        bytes32 indexed passportHash,
        bytes32 policyHash,
        bytes32 approvalHash,
        address recorder,
        uint64 recordedAt
    );

    function record(
        bytes32 planHash,
        bytes32 passportHash,
        bytes32 policyHash,
        bytes32 approvalHash
    ) external returns (bytes32 receiptId) {
        require(planHash != bytes32(0), "EMPTY_PLAN_HASH");
        require(passportHash != bytes32(0), "EMPTY_PASSPORT_HASH");
        require(policyHash != bytes32(0), "EMPTY_POLICY_HASH");

        receiptId = keccak256(abi.encode(
            block.chainid,
            msg.sender,
            planHash,
            passportHash,
            policyHash,
            approvalHash
        ));
        require(receipts[receiptId].recordedAt == 0, "RECEIPT_EXISTS");

        uint64 timestamp = uint64(block.timestamp);
        receipts[receiptId] = Receipt({
            planHash: planHash,
            passportHash: passportHash,
            policyHash: policyHash,
            approvalHash: approvalHash,
            recorder: msg.sender,
            recordedAt: timestamp
        });
        emit ReceiptRecorded(receiptId, planHash, passportHash, policyHash, approvalHash, msg.sender, timestamp);
    }
}
